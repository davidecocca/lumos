const { DEFAULT_WORKSPACE_ID } = require('../../workspaceContext');

const noteSchema = `
CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    workspace_id INTEGER NOT NULL DEFAULT ${DEFAULT_WORKSPACE_ID},
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_id INTEGER,
    workspace_id INTEGER NOT NULL DEFAULT ${DEFAULT_WORKSPACE_ID},
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
);
CREATE VIRTUAL TABLE IF NOT EXISTS note_search_fts USING fts5(
    title,
    topic,
    content_text,
    note_id UNINDEXED,
    tokenize = 'unicode61'
);
CREATE TABLE IF NOT EXISTS vector_sync (
    note_id INTEGER PRIMARY KEY,
    synced_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_folders_workspace ON folders(workspace_id, name);
CREATE INDEX IF NOT EXISTS idx_notes_workspace ON notes(workspace_id, title);
CREATE INDEX IF NOT EXISTS idx_notes_workspace_folder ON notes(workspace_id, folder_id);
`;

module.exports = noteSchema;
