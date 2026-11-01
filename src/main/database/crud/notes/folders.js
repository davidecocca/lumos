const db = require('../../db');
const { getActiveWorkspaceId } = require('../../../workspaceContext');

// Create a new folder
function createFolder(name, callback) {
    const sql = `INSERT INTO folders (name, workspace_id) VALUES (?, ?)`;
    db.run(sql, [name, getActiveWorkspaceId()], function (err) {
        callback(err, this ? this.lastID : null);
    });
}

// Rename a folder
function updateFolder(id, newName, callback) {
    const sql = `UPDATE folders SET name = ? WHERE id = ? AND workspace_id = ?`;
    db.run(sql, [newName, id, getActiveWorkspaceId()], function (err) {
        callback(err, this.changes);
    });
}

// Delete a folder
function deleteFolder(id, callback) {
    const sql = `DELETE FROM folders WHERE id = ? AND workspace_id = ?`;
    db.run(sql, [id, getActiveWorkspaceId()], function (err) {
        callback(err, this.changes);
    });
}

// List all folders
function listFolders(callback) {
    const sql = `SELECT * FROM folders WHERE workspace_id = ? ORDER BY name`;
    db.all(sql, [getActiveWorkspaceId()], (err, rows) => {
        callback(err, rows);
    });
}

// Get all notes in a folder
function getFolderContent(id, callback) {
    const sql = `
    SELECT notes.id, notes.title, notes.favorite, notes.created_at, notes.updated_at, notes.last_viewed_at, notes.folder_id, folders.name AS folder_name
    FROM notes
    LEFT JOIN folders ON notes.folder_id = folders.id
    WHERE notes.folder_id = ? AND notes.workspace_id = ? ORDER BY title ASC`;
    db.all(sql, [id, getActiveWorkspaceId()], (err, rows) => {
        callback(err, rows);
    });
}

// Get a folder by ID
function getFolder(id, callback) {
    const sql = `SELECT * FROM folders WHERE id = ? AND workspace_id = ?`;
    db.get(sql, [id, getActiveWorkspaceId()], (err, row) => {
        callback(err, row);
    });
}

module.exports = {
    createFolder,
    getFolderContent,
    getFolder,
    updateFolder,
    deleteFolder,
    listFolders,
};
