const db = require('./db');
const vectorStore = require('./vectorStore');

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
    db.get(sql, [id], (err, row) => {
        if (row && row.content_json) {
            row.content_json = JSON.parse(row.content_json);
        }
        callback(err, row);
    });
}

// Get notes by ids
function getNotesByIds(ids, callback) {
    const sql = `
    SELECT notes.id, notes.title, folders.name AS folder_name 
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
    const sql = `
    UPDATE notes 
    SET topic = ?, content_json = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `;
    db.run(sql, [topic, JSON.stringify(contentJson), id], async function (err) {
        if (err) {
            callback(err);
            return;
        }
        try {
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
};
