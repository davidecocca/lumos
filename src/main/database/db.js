const sqlite3 = require('sqlite3').verbose();
const { getDatabasePath, initializeStorage } = require('../storagePaths');
const { DEFAULT_WORKSPACE_ID } = require('../workspaceContext');
const workspaceSchema = require('./schemas/workspace');
const noteSchema = require('./schemas/note');
const kanbanSchema = require('./schemas/kanban');
const chatSchema = require('./schemas/chat');

initializeStorage();

const db = new sqlite3.Database(getDatabasePath(), (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function exec(sql) {
    return new Promise((resolve, reject) => {
        db.exec(sql, (error) => (error ? reject(error) : resolve()));
    });
}

async function initializeSchema() {
    await run(`PRAGMA foreign_keys = ON`);

    await exec(workspaceSchema);
    await run(
        `INSERT OR IGNORE INTO workspaces (id, name, is_default) VALUES (?, ?, 1)`,
        [DEFAULT_WORKSPACE_ID, 'Default'],
    );

    // Initialize feature schemas after the tables they reference.
    await exec(noteSchema);
    await exec(kanbanSchema);
    await exec(chatSchema);
}

db.ready = initializeSchema().catch((error) => {
    console.error('Error initializing the SQLite database:', error.message);
    throw error;
});

module.exports = db;
