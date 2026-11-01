const db = require('../../db');
const vectorStore = require('../../vectorStore');
const vectorIndexer = require('../../../services/vectorIndexer');
const imageService = require('../../../services/imageService');
const { getActiveWorkspaceId } = require('../../../workspaceContext');
const {
    normalizeSearchText,
    updateNoteSearchIndex,
    refreshNoteSearchIndex,
    deleteNoteSearchIndex,
} = require('./search');
const { deleteNoteChatConversations } = require('../chat');
const { deleteNoteVectorSyncRow } = require('./vectorSync');

// Create a new note
function createNote(folder_id, title, contentJson, contentText, callback) {
    const searchableContentText = normalizeSearchText(contentText);
    const sql = `
    INSERT INTO notes (folder_id, workspace_id, title, content_json, content_text)
    SELECT ?, workspace_id, ?, ?, ?
    FROM folders
    WHERE id = ? AND workspace_id = ?
  `;
    db.run(
        sql,
        [
            folder_id,
            title,
            JSON.stringify(contentJson),
            searchableContentText,
            folder_id,
            getActiveWorkspaceId(),
        ],
        async function (err) {
            if (err) {
                callback(err, this ? this.lastID : null);
                return;
            }
            if (!this.changes) {
                callback(new Error('Destination folder not found.'), null);
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
        },
    );
    // Note: the note is not added to the vector store here because the content is not yet available
}

// Get a note by ID
function getNote(id, callback) {
    const sql = `
    SELECT notes.*, folders.name AS folder_name
    FROM notes
    LEFT JOIN folders ON notes.folder_id = folders.id
        WHERE notes.id = ? AND notes.workspace_id = ?`;
    db.get(sql, [id, getActiveWorkspaceId()], async (err, row) => {
        if (err) {
            callback(err, row);
            return;
        }

        try {
            if (row && row.content_json) {
                row.content_json = JSON.parse(row.content_json);
                row.content_json =
                    await imageService.resolveNoteContentForDisplay(
                        row.content_json,
                    );
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
    WHERE notes.id IN (${ids.map(() => '?').join(',')})
      AND notes.workspace_id = ?`;
    db.all(sql, [...ids, getActiveWorkspaceId()], (err, rows) => {
        callback(err, rows);
    });
}

// List all notes
function listNotes(callback) {
    const sql = `
    SELECT notes.id, notes.title, folders.name AS folder_name
    FROM notes
    LEFT JOIN folders ON notes.folder_id = folders.id
    WHERE notes.workspace_id = ?
    ORDER BY title ASC
  `;
    db.all(sql, [getActiveWorkspaceId()], (err, rows) => {
        callback(err, rows);
    });
}

// Rename a note
function renameNote(id, newTitle, callback) {
    const sql = `UPDATE notes SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?`;
    db.run(sql, [newTitle, id, getActiveWorkspaceId()], async function (err) {
        if (err) {
            callback(err, this.changes);
            return;
        }
        if (!this.changes) {
            callback(new Error('Note not found in the active workspace.'), 0);
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
    const normalizedContent =
        imageService.normalizeNoteContentForStorage(contentJson);
    const referencedImages =
        imageService.collectManagedImagePaths(normalizedContent);
    const searchableContentText = normalizeSearchText(contentText);
    const sql = `
    UPDATE notes
    SET topic = ?, content_json = ?, content_text = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND workspace_id = ?
  `;

    db.run(
        sql,
        [
            topic,
            JSON.stringify(normalizedContent),
            searchableContentText,
            id,
            getActiveWorkspaceId(),
        ],
        async function (err) {
            if (err) {
                callback(err);
                return;
            }
            if (!this.changes) {
                callback(new Error('Note not found in the active workspace.'));
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
        },
    );
}

// Delete a note
function deleteNote(id, callback) {
    const sql = `DELETE FROM notes WHERE id = ? AND workspace_id = ?`;
    db.run(sql, [id, getActiveWorkspaceId()], async function (err) {
        if (err) {
            callback(err);
            return;
        }
        if (!this.changes) {
            callback(new Error('Note not found in the active workspace.'));
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
    const getNotesSql = `SELECT id FROM notes WHERE folder_id = ? AND workspace_id = ?`;
    db.all(
        getNotesSql,
        [folderId, getActiveWorkspaceId()],
        async (err, notes) => {
            if (err) {
                callback(err);
                return;
            }
            if (!this.changes) {
                callback(new Error('Note not found in the active workspace.'));
                return;
            }

            // Delete notes from the database
            const deleteNotesSql = `DELETE FROM notes WHERE folder_id = ? AND workspace_id = ?`;
            db.run(
                deleteNotesSql,
                [folderId, getActiveWorkspaceId()],
                async function (err) {
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
                },
            );
        },
    );
}

// Move a note to a different folder
function moveNoteToFolder(noteId, newFolderId, callback) {
    const sql = `
        UPDATE notes
        SET folder_id = ?
        WHERE id = ?
          AND workspace_id = ?
          AND EXISTS (
              SELECT 1 FROM folders
              WHERE folders.id = ? AND folders.workspace_id = ?
          )
    `;
    db.run(
        sql,
        [
            newFolderId,
            noteId,
            getActiveWorkspaceId(),
            newFolderId,
            getActiveWorkspaceId(),
        ],
        function (err) {
            callback(
                err ||
                    (this.changes
                        ? null
                        : new Error('Note or destination folder not found.')),
                this.changes,
            );
        },
    );
}

// Mark note as favorite/unfavorite
function setNoteFavorite(id, isFavorite, callback) {
    const sql = `UPDATE notes SET favorite = ? WHERE id = ? AND workspace_id = ?`;
    db.run(
        sql,
        [isFavorite ? 1 : 0, id, getActiveWorkspaceId()],
        function (err) {
            callback(err, this.changes);
        },
    );
}

// Update the last viewed timestamp when a note is opened
function updateNoteLastViewed(id, callback) {
    const sql = `UPDATE notes SET last_viewed_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?`;
    db.run(sql, [id, getActiveWorkspaceId()], function (err) {
        callback(err, this.changes);
    });
}

// Get all favorite notes
function getFavoriteNotes(callback) {
    const sql = `
    SELECT notes.id, notes.title, notes.topic, notes.favorite, notes.folder_id, notes.updated_at, folders.name AS folder_name
    FROM notes
    LEFT JOIN folders ON notes.folder_id = folders.id
    WHERE favorite = 1 AND notes.workspace_id = ?
    ORDER BY title ASC
    `;
    db.all(sql, [getActiveWorkspaceId()], (err, rows) => {
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
    WHERE last_viewed_at IS NOT NULL AND notes.workspace_id = ?
    ORDER BY last_viewed_at DESC
    LIMIT 10
  `;
    db.all(sql, [getActiveWorkspaceId()], (err, rows) => {
        callback(err, rows);
    });
}

module.exports = {
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
};
