const db = require('./db');
const vectorStore = require('./vectorStore');
const imageService = require('../services/imageService');

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
function createNote(folder_id, title, contentJson, callback) {
    const sql = `
    INSERT INTO notes (folder_id, title, content_json)
    VALUES (?, ?, ?)
  `;
    db.run(sql, [folder_id, title, JSON.stringify(contentJson)], function (err) {
        callback(err, this ? this.lastID : null);
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
    const sql = `UPDATE notes SET title = ? WHERE id = ?`;
    db.run(sql, [newTitle, id], function (err) {
        callback(err, this.changes);
    });
}

// Update note content
function updateNote(id, topic, contentJson, contentText, callback) {
    const normalizedContent = imageService.normalizeNoteContentForStorage(contentJson);
    const referencedImages = imageService.collectManagedImagePaths(normalizedContent);
    const sql = `
    UPDATE notes 
    SET topic = ?, content_json = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `;
    
    db.run(sql, [topic, JSON.stringify(normalizedContent), id], async function (err) {
        if (err) {
            callback(err);
            return;
        }
        
        try {
            await imageService.pruneNoteImages(id, referencedImages);
            await vectorStore.deleteNote(id);
            await vectorStore.addNote(id, contentText);
            callback(null);
        } catch (vectorErr) {
            callback(vectorErr);
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

// Search notes by keyword across title, topic, content, and folder name
function searchNotes(query, limit = 10, callback) {
    const normalizedQuery = String(query || '').trim().toLowerCase();
    const safeLimit = Math.max(1, Number(limit) || 10);
    
    if (!normalizedQuery) {
        callback(null, []);
        return;
    }
    
    const searchTerms = [...new Set(normalizedQuery.split(/\s+/).filter(Boolean))].slice(0, 8);
    const whereClauses = [];
    const scoreClauses = [];
    const whereParams = [];
    const scoreParams = [];
    
    searchTerms.forEach((term) => {
        const exact = term;
        const prefix = `${term}%`;
        const contains = `%${term}%`;
        
        whereClauses.push(`
            lower(notes.title) LIKE ?
            OR lower(COALESCE(notes.topic, '')) LIKE ?
            OR lower(COALESCE(notes.content_json, '')) LIKE ?
            OR lower(COALESCE(folders.name, '')) LIKE ?
        `);
            whereParams.push(contains, contains, contains, contains);
            
            scoreClauses.push(`
            CASE
                WHEN lower(notes.title) = ? THEN 120
                WHEN lower(notes.title) LIKE ? THEN 80
                WHEN lower(notes.title) LIKE ? THEN 55
                ELSE 0
            END
            + CASE WHEN lower(COALESCE(notes.topic, '')) LIKE ? THEN 30 ELSE 0 END
            + CASE WHEN lower(COALESCE(notes.content_json, '')) LIKE ? THEN 12 ELSE 0 END
            + CASE WHEN lower(COALESCE(folders.name, '')) LIKE ? THEN 18 ELSE 0 END
        `);
                scoreParams.push(exact, prefix, contains, contains, contains, contains);
            });
            
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
        (${scoreClauses.join(' + ')}) AS keyword_score
    FROM notes
    LEFT JOIN folders ON notes.folder_id = folders.id
    WHERE ${whereClauses.map(clause => `(${clause})`).join(' OR ')}
    ORDER BY keyword_score DESC,
             COALESCE(notes.last_viewed_at, notes.updated_at) DESC,
             notes.title ASC
    LIMIT ?
    `;
            
            db.all(sql, [...scoreParams, ...whereParams, safeLimit], (err, rows) => {
                callback(err, rows);
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
        };
