const sqlite3 = require('sqlite3').verbose();
const { getDatabasePath, initializeStorage } = require('../storagePaths');
const { DEFAULT_WORKSPACE_ID } = require('../workspaceContext');

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

async function initializeSchema() {
    await run(`PRAGMA foreign_keys = ON`);

    await run(`
        CREATE TABLE IF NOT EXISTS workspaces (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            icon TEXT NOT NULL DEFAULT 'ph-squares-four',
            color TEXT NOT NULL DEFAULT 'primary',
            is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await run(
        `INSERT OR IGNORE INTO workspaces (id, name, is_default) VALUES (?, ?, 1)`,
        [DEFAULT_WORKSPACE_ID, 'Default'],
    );

    await run(`
        CREATE TABLE IF NOT EXISTS folders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            workspace_id TEXT NOT NULL DEFAULT '${DEFAULT_WORKSPACE_ID}',
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            folder_id INTEGER,
            workspace_id TEXT NOT NULL DEFAULT '${DEFAULT_WORKSPACE_ID}',
            title TEXT NOT NULL,
            topic TEXT,
            content_json TEXT NOT NULL,
            content_text TEXT NOT NULL,
            favorite INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (folder_id) REFERENCES folders(id),
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
        )
    `);

    await run(`
        CREATE VIRTUAL TABLE IF NOT EXISTS note_search_fts USING fts5(
            title,
            topic,
            content_text,
            note_id UNINDEXED,
            tokenize = 'unicode61'
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS vector_sync (
            note_id INTEGER PRIMARY KEY,
            synced_at TEXT NOT NULL
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS chat_conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id TEXT NOT NULL DEFAULT '${DEFAULT_WORKSPACE_ID}',
            scope TEXT NOT NULL CHECK (scope IN ('all', 'note')),
            note_id INTEGER,
            title TEXT NOT NULL DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (note_id) REFERENCES notes(id),
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
            content TEXT NOT NULL,
            sources_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id)
        )
    `);

    await run(
        `CREATE INDEX IF NOT EXISTS idx_folders_workspace ON folders(workspace_id, name)`,
    );
    await run(
        `CREATE INDEX IF NOT EXISTS idx_notes_workspace ON notes(workspace_id, title)`,
    );
    await run(
        `CREATE INDEX IF NOT EXISTS idx_notes_workspace_folder ON notes(workspace_id, folder_id)`,
    );
    await run(
        `CREATE INDEX IF NOT EXISTS idx_chat_conversations_workspace ON chat_conversations(workspace_id, updated_at)`,
    );
    await run(
        `CREATE INDEX IF NOT EXISTS idx_chat_conversations_scope_updated ON chat_conversations(scope, updated_at)`,
    );
    await run(
        `CREATE INDEX IF NOT EXISTS idx_chat_conversations_note_updated ON chat_conversations(note_id, updated_at)`,
    );
    await run(
        `CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id, created_at)`,
    );
}

db.ready = initializeSchema().catch((error) => {
    console.error('Error initializing the SQLite database:', error.message);
    throw error;
});

module.exports = db;
