const { DEFAULT_WORKSPACE_ID } = require('../../workspaceContext');

const chatSchema = `
CREATE TABLE IF NOT EXISTS chat_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL DEFAULT ${DEFAULT_WORKSPACE_ID},
    scope TEXT NOT NULL CHECK (scope IN ('all', 'note')),
    note_id INTEGER,
    title TEXT NOT NULL DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (note_id) REFERENCES notes(id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    sources_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id)
);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_workspace ON chat_conversations(workspace_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_scope_updated ON chat_conversations(scope, updated_at);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_note_updated ON chat_conversations(note_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id, created_at);
`;

module.exports = chatSchema;
