const db = require('./db');
const vectorStore = require('./vectorStore');
const vectorIndexer = require('../services/vectorIndexer');
const imageService = require('../services/imageService');

/* ---------------------------------
Helper functions for search indexing
--------------------------------- */

// Normalize text before storing/indexing it
function normalizeSearchText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

// Turn the user search query into safe FTS terms
function getSearchTokens(query) {
    const matches = String(query || '').normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}_]+/gu) || [];
    return [...new Set(matches)].slice(0, 8);
}

// Delete a note from the FTS index
function deleteNoteSearchIndex(noteId) {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM note_search_fts WHERE rowid = ?`, [noteId], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

// Update or insert a note into the FTS index
function updateNoteSearchIndex(note) {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM note_search_fts WHERE rowid = ?`, [note.id], (deleteErr) => {
            if (deleteErr) {
                reject(deleteErr);
                return;
            }

            db.run(`
                INSERT INTO note_search_fts(rowid, title, topic, content_text, note_id)
                VALUES (?, ?, ?, ?, ?)
            `, [
                note.id,
                note.title || '',
                note.topic || '',
                note.content_text || '',
                note.id,
            ], (insertErr) => {
                if (insertErr) reject(insertErr);
                else resolve();
            });
        });
    });
}

// Refresh the FTS index for a note
function refreshNoteSearchIndex(noteId) {
    return new Promise((resolve, reject) => {
        db.get(`
            SELECT id, title, topic, content_text
            FROM notes
            WHERE id = ?
        `, [noteId], async (err, note) => {
            if (err) {
                reject(err);
                return;
            }

            if (!note) {
                resolve();
                return;
            }

            try {
                await updateNoteSearchIndex(note);
                resolve();
            } catch (searchErr) {
                reject(searchErr);
            }
        });
    });
}

function deleteNoteChatConversations(noteId) {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT id
            FROM chat_conversations
            WHERE scope = 'note' AND note_id = ?
        `, [noteId], (selectErr, rows) => {
            if (selectErr) {
                reject(selectErr);
                return;
            }

            const conversationIds = rows.map((row) => row.id);
            if (conversationIds.length === 0) {
                resolve();
                return;
            }

            const placeholders = conversationIds.map(() => '?').join(',');
            db.run(`DELETE FROM chat_messages WHERE conversation_id IN (${placeholders})`, conversationIds, (messageErr) => {
                if (messageErr) {
                    reject(messageErr);
                    return;
                }

                db.run(`DELETE FROM chat_conversations WHERE id IN (${placeholders})`, conversationIds, (conversationErr) => {
                    if (conversationErr) reject(conversationErr);
                    else resolve();
                });
            });
        });
    });
}

// Delete a note's row from the vector sync tracker
function deleteNoteVectorSyncRow(noteId) {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM vector_sync WHERE note_id = ?`, [noteId], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

// Mark a note as up to date in the vector index
function setNoteVectorSynced(noteId, syncedAt, callback) {
    db.run(`
        INSERT INTO vector_sync (note_id, synced_at)
        VALUES (?, ?)
        ON CONFLICT(note_id) DO UPDATE SET synced_at = excluded.synced_at
    `, [noteId, syncedAt || null], function (err) {
        callback(err, this ? this.changes : 0);
    });
}

// Notes missing or stale in the vector index
function getNotesNeedingVectorSync(callback) {
    db.all(`
        SELECT n.id
        FROM notes n
        LEFT JOIN vector_sync vs ON vs.note_id = n.id
        WHERE vs.note_id IS NULL OR COALESCE(vs.synced_at, '') < n.updated_at
    `, [], (err, rows) => {
        callback(err, rows);
    });
}

// Raw note fields needed by the background indexer
function getNoteRawForIndexing(noteId, callback) {
    db.get(`
        SELECT id, title, topic, content_text, updated_at
        FROM notes
        WHERE id = ?
    `, [noteId], (err, row) => {
        callback(err, row);
    });
}

// Reset all vector sync markers (used after a full index rebuild)
function clearVectorSync(callback) {
    db.run(`DELETE FROM vector_sync`, [], function (err) {
        callback(err, this ? this.changes : 0);
    });
}

// Counts for the RAG index status UI
function getVectorSyncStats(callback) {
    db.get(`
        SELECT
            (SELECT COUNT(*) FROM vector_sync) AS indexedCount,
            (SELECT COUNT(*) FROM notes) AS totalNotes
    `, [], (err, row) => {
        callback(err, row || { indexedCount: 0, totalNotes: 0 });
    });
}

/* ---------------------------
Folder CRUD Operations
--------------------------- */

// Create a new folder
function createFolder(name, callback) {
    const sql = `INSERT INTO folders (name) VALUES (?)`;
    db.run(sql, [name], function (err) {
        callback(err, this ? this.lastID : null);
    });
}

// Rename a folder
function updateFolder(id, newName, callback) {
    const sql = `UPDATE folders SET name = ? WHERE id = ?`;
    db.run(sql, [newName, id], function (err) {
        callback(err, this.changes);
    });
}

// Delete a folder
function deleteFolder(id, callback) {
    const sql = `DELETE FROM folders WHERE id = ?`;
    db.run(sql, [id], function (err) {
        callback(err, this.changes);
    });
}

// List all folders
function listFolders(callback) {
    const sql = `SELECT * FROM folders ORDER BY name`;
    db.all(sql, [], (err, rows) => {
        callback(err, rows);
    });
}

// Get all notes in a folder
function getFolderContent(id, callback) {
    const sql = `
    SELECT notes.id, notes.title, notes.favorite, notes.created_at, notes.updated_at, notes.last_viewed_at, notes.folder_id, folders.name AS folder_name
    FROM notes
    LEFT JOIN folders ON notes.folder_id = folders.id
    WHERE folder_id = ? ORDER BY title ASC`;
    db.all(sql, [id], (err, rows) => {
        callback(err, rows);
    });
}

// Get a folder by ID
function getFolder(id, callback) {
    const sql = `SELECT * FROM folders WHERE id = ?`;
    db.get(sql, [id], (err, row) => {
        callback(err, row);
    });
}

/* ---------------------------
Notes CRUD Operations
--------------------------- */

// Create a new note
function createNote(folder_id, title, contentJson, contentText, callback) {
    const searchableContentText = normalizeSearchText(contentText);
    const sql = `
    INSERT INTO notes (folder_id, title, content_json, content_text)
    VALUES (?, ?, ?, ?)
  `;
    db.run(sql, [folder_id, title, JSON.stringify(contentJson), searchableContentText], async function (err) {
        if (err) {
            callback(err, this ? this.lastID : null);
            return;
        }

        try {
            await updateNoteSearchIndex({
                id: this.lastID,
                title,
                topic: '',
                content_text: searchableContentText,
            });
            callback(null, this.lastID);
        } catch (searchErr) {
            callback(searchErr, this.lastID);
        }
    });
    // Note: the note is not added to the vector store here because the content is not yet available
}

// Get a note by ID
function getNote(id, callback) {
    const sql = `
    SELECT notes.*, folders.name AS folder_name 
    FROM notes 
    LEFT JOIN folders ON notes.folder_id = folders.id 
    WHERE notes.id = ?`;
    db.get(sql, [id], async (err, row) => {
        if (err) {
            callback(err, row);
            return;
        }
        
        try {
            if (row && row.content_json) {
                row.content_json = JSON.parse(row.content_json);
                row.content_json = await imageService.resolveNoteContentForDisplay(row.content_json);
            }
        } catch (resolveErr) {
            callback(resolveErr, row);
            return;
        }
        
        callback(null, row);
    });
}

// Get notes by ids
function getNotesByIds(ids, callback) {
    if (!Array.isArray(ids) || ids.length === 0) {
        callback(null, []);
        return;
    }
    
    const sql = `
    SELECT notes.id, notes.title, notes.topic, notes.favorite, notes.folder_id,
           notes.updated_at, notes.last_viewed_at, folders.name AS folder_name
    FROM notes 
    LEFT JOIN folders ON notes.folder_id = folders.id 
    WHERE notes.id IN (${ids.join(',')})`;
    db.all(sql, [], (err, rows) => {
        callback(err, rows);
    });
}

// List all notes
function listNotes(callback) {
    const sql = `
    SELECT notes.id, notes.title, folders.name AS folder_name
    FROM notes
    LEFT JOIN folders ON notes.folder_id = folders.id
    ORDER BY title ASC
  `;
    db.all(sql, [], (err, rows) => {
        callback(err, rows);
    });
}

// Rename a note
function renameNote(id, newTitle, callback) {
    const sql = `UPDATE notes SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    db.run(sql, [newTitle, id], async function (err) {
        if (err) {
            callback(err, this.changes);
            return;
        }

        try {
            await refreshNoteSearchIndex(id);
            // The title is embedded with each chunk, so re-index after renames.
            vectorIndexer.requestIndex(id);
            callback(null, this.changes);
        } catch (searchErr) {
            callback(searchErr, this.changes);
        }
    });
}

// Update note content
function updateNote(id, topic, contentJson, contentText, callback) {
    const normalizedContent = imageService.normalizeNoteContentForStorage(contentJson);
    const referencedImages = imageService.collectManagedImagePaths(normalizedContent);
    const searchableContentText = normalizeSearchText(contentText);
    const sql = `
    UPDATE notes 
    SET topic = ?, content_json = ?, content_text = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

    db.run(sql, [topic, JSON.stringify(normalizedContent), searchableContentText, id], async function (err) {
        if (err) {
            callback(err);
            return;
        }

        try {
            await refreshNoteSearchIndex(id);
            await imageService.pruneNoteImages(id, referencedImages);
            // Indexing is asynchronous: saves never wait on embeddings.
            vectorIndexer.requestIndex(id);
            callback(null);
        } catch (searchErr) {
            callback(searchErr);
        }
    });
}

// Delete a note
function deleteNote(id, callback) {
    const sql = `DELETE FROM notes WHERE id = ?`;
    db.run(sql, [id], async function (err) {
        if (err) {
            callback(err);
            return;
        }
        try {
            await deleteNoteChatConversations(id);
            await deleteNoteSearchIndex(id);
            await deleteNoteVectorSyncRow(id);
            await vectorStore.deleteNote(id);
            await imageService.deleteNoteImages(id);
            callback(null);
        } catch (vectorErr) {
            callback(vectorErr);
        }
    });
}

// Delete all notes in a folder
function deleteNotesInFolder(folderId, callback) {
    // Get all notes in the folder
    const getNotesSql = `SELECT id FROM notes WHERE folder_id = ?`;
    db.all(getNotesSql, [folderId], async (err, notes) => {
        if (err) {
            callback(err);
            return;
        }
        
        // Delete notes from the database
        const deleteNotesSql = `DELETE FROM notes WHERE folder_id = ?`;
        db.run(deleteNotesSql, [folderId], async function (err) {
            if (err) {
                callback(err);
                return;
            }
            
            try {
                for (const note of notes) {
                    await deleteNoteChatConversations(note.id);
                }

                for (const note of notes) {
                    await deleteNoteSearchIndex(note.id);
                    await deleteNoteVectorSyncRow(note.id);
                }

                // Delete each note from vector store
                for (const note of notes) {
                    await vectorStore.deleteNote(note.id);
                    await imageService.deleteNoteImages(note.id);
                }
                callback(null, this.changes);
            } catch (vectorErr) {
                callback(vectorErr);
            }
        });
    });
}

// Move a note to a different folder
function moveNoteToFolder(noteId, newFolderId, callback) {
    const sql = `UPDATE notes SET folder_id = ? WHERE id = ?`;
    db.run(sql, [newFolderId, noteId], function (err) {
        callback(err, this.changes);
    });
}

// Mark note as favorite/unfavorite
function setNoteFavorite(id, isFavorite, callback) {
    const sql = `UPDATE notes SET favorite = ? WHERE id = ?`;
    db.run(sql, [isFavorite ? 1 : 0, id], function (err) {
        callback(err, this.changes);
    });
}

// Update the last viewed timestamp when a note is opened
function updateNoteLastViewed(id, callback) {
    const sql = `UPDATE notes SET last_viewed_at = CURRENT_TIMESTAMP WHERE id = ?`;
    db.run(sql, [id], function (err) {
        callback(err, this.changes);
    });
}

// Get all favorite notes
function getFavoriteNotes(callback) {
    const sql = `
    SELECT notes.id, notes.title, notes.topic, notes.favorite, notes.folder_id, notes.updated_at, folders.name AS folder_name
    FROM notes
    LEFT JOIN folders ON notes.folder_id = folders.id
    WHERE favorite = 1
    ORDER BY title ASC
    `;
    db.all(sql, [], (err, rows) => {
        callback(err, rows);
    });
}

// Get all recently viewed notes (top 10)
function getLastViewedNotes(callback) {
    const sql = `
    SELECT notes.id, notes.title, notes.topic, notes.favorite, notes.folder_id, notes.updated_at, 
           notes.last_viewed_at, folders.name AS folder_name
    FROM notes
    LEFT JOIN folders ON notes.folder_id = folders.id
    WHERE last_viewed_at IS NOT NULL
    ORDER BY last_viewed_at DESC
    LIMIT 10
  `;
    db.all(sql, [], (err, rows) => {
        callback(err, rows);
    });
}

// Search notes by keyword across title, topic, and plain note content
function searchNotes(query, limit = 10, callback) {
    const searchTerms = getSearchTokens(query);
    const safeLimit = Math.max(1, Number(limit) || 10);
    
    if (searchTerms.length === 0) {
        callback(null, []);
        return;
    }
    
    const ftsQuery = searchTerms.map((term) => `${term}*`).join(' ');
    const sql = `
    SELECT
        notes.id,
        notes.title,
        notes.topic,
        notes.favorite,
        notes.folder_id,
        notes.updated_at,
        notes.last_viewed_at,
        folders.name AS folder_name,
        -bm25(note_search_fts, 8.0, 4.0, 1.0, 0.0) AS keyword_score
    FROM note_search_fts
    JOIN notes ON notes.id = note_search_fts.note_id
    LEFT JOIN folders ON notes.folder_id = folders.id
    WHERE note_search_fts MATCH ?
    ORDER BY keyword_score DESC,
             COALESCE(notes.last_viewed_at, notes.updated_at) DESC,
             notes.title ASC
    LIMIT ?
    `;

    db.all(sql, [ftsQuery, safeLimit], (err, rows) => {
        callback(err, rows);
    });
}

/* ---------------------------
Chat CRUD Operations
--------------------------- */

function normalizeChatScope(scope) {
    return scope === 'note' ? 'note' : 'all';
}

function parseMessageSources(message) {
    if (!message.sources_json) return [];

    try {
        const parsed = JSON.parse(message.sources_json);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        return [];
    }
}

function mapConversation(row) {
    if (!row) return null;

    return {
        id: row.id,
        scope: row.scope,
        noteId: row.note_id,
        title: row.title,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapChatMessage(row) {
    return {
        id: row.id,
        conversationId: row.conversation_id,
        role: row.role,
        content: row.content,
        sources: parseMessageSources(row),
        createdAt: row.created_at,
    };
}

function createChatConversation({ scope = 'all', noteId = null, title = '' }, callback) {
    const normalizedScope = normalizeChatScope(scope);
    const normalizedNoteId = normalizedScope === 'note' ? noteId : null;

    db.run(`
        INSERT INTO chat_conversations (scope, note_id, title)
        VALUES (?, ?, ?)
    `, [normalizedScope, normalizedNoteId, title || 'New chat'], function (err) {
        if (err) {
            callback(err);
            return;
        }

        getChatConversation(this.lastID, callback);
    });
}

function listChatConversations({ scope = 'all', noteId = null, limit = 20 } = {}, callback) {
    const normalizedScope = normalizeChatScope(scope);
    const safeLimit = Math.max(1, Number(limit) || 20);
    const params = [normalizedScope];
    let where = `scope = ?`;

    if (normalizedScope === 'note') {
        where += ` AND note_id = ?`;
        params.push(noteId);
    }

    params.push(safeLimit);

    db.all(`
        SELECT id, scope, note_id, title, created_at, updated_at
        FROM chat_conversations
        WHERE ${where}
        ORDER BY updated_at DESC, id DESC
        LIMIT ?
    `, params, (err, rows) => {
        callback(err, rows ? rows.map(mapConversation) : []);
    });
}

function getChatConversation(id, callback) {
    db.get(`
        SELECT id, scope, note_id, title, created_at, updated_at
        FROM chat_conversations
        WHERE id = ?
    `, [id], (conversationErr, conversation) => {
        if (conversationErr) {
            callback(conversationErr);
            return;
        }

        if (!conversation) {
            callback(null, null);
            return;
        }

        db.all(`
            SELECT id, conversation_id, role, content, sources_json, created_at
            FROM chat_messages
            WHERE conversation_id = ?
            ORDER BY created_at ASC, id ASC
        `, [id], (messagesErr, messages) => {
            if (messagesErr) {
                callback(messagesErr);
                return;
            }

            callback(null, {
                ...mapConversation(conversation),
                messages: messages.map(mapChatMessage),
            });
        });
    });
}

function appendChatMessage({ conversationId, role, content, sources = [] }, callback) {
    const normalizedRole = role === 'assistant' ? 'assistant' : 'user';
    const sourcesJson = normalizedRole === 'assistant' ? JSON.stringify(sources || []) : null;

    db.run(`
        INSERT INTO chat_messages (conversation_id, role, content, sources_json)
        VALUES (?, ?, ?, ?)
    `, [conversationId, normalizedRole, content || '', sourcesJson], function (err) {
        if (err) {
            callback(err);
            return;
        }

        db.run(`
            UPDATE chat_conversations
            SET updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [conversationId], (updateErr) => {
            if (updateErr) {
                callback(updateErr);
                return;
            }

            callback(null, this.lastID);
        });
    });
}

function updateChatConversation({ id, title }, callback) {
    db.run(`
        UPDATE chat_conversations
        SET title = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [title || 'New chat', id], function (err) {
        callback(err, this ? this.changes : 0);
    });
}

function deleteChatConversation(id, callback) {
    db.run(`DELETE FROM chat_messages WHERE conversation_id = ?`, [id], (messageErr) => {
        if (messageErr) {
            callback(messageErr);
            return;
        }

        db.run(`DELETE FROM chat_conversations WHERE id = ?`, [id], function (conversationErr) {
            callback(conversationErr, this ? this.changes : 0);
        });
    });
}

module.exports = {
    createFolder,
    getFolderContent,
    getFolder,
    updateFolder,
    deleteFolder,
    listFolders,
    createNote,
    getNote,
    getNotesByIds,
    listNotes,
    renameNote,
    updateNote,
    deleteNote,
    moveNoteToFolder,
    deleteNotesInFolder,
    setNoteFavorite,
    updateNoteLastViewed,
    getFavoriteNotes,
    getLastViewedNotes,
    searchNotes,
    getNoteRawForIndexing,
    setNoteVectorSynced,
    getNotesNeedingVectorSync,
    clearVectorSync,
    getVectorSyncStats,
    createChatConversation,
    listChatConversations,
    getChatConversation,
    appendChatMessage,
    updateChatConversation,
    deleteChatConversation,
};
