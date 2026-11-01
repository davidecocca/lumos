const kanbanSchema = `
CREATE TABLE IF NOT EXISTS kanban_boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS kanban_columns (
    board_id INTEGER NOT NULL,
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    progress_type TEXT NOT NULL,
    position INTEGER NOT NULL,
    UNIQUE (board_id, id),
    FOREIGN KEY (board_id) REFERENCES kanban_boards(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS kanban_cards (
    board_id INTEGER NOT NULL,
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    column_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description_json TEXT NOT NULL,
    due_date TEXT,
    priority TEXT,
    tags_json TEXT NOT NULL DEFAULT '[]',
    note_ids_json TEXT NOT NULL DEFAULT '[]',
    position INTEGER NOT NULL,
    created_at TEXT,
    updated_at TEXT,
    completed_at TEXT,
    FOREIGN KEY (board_id) REFERENCES kanban_boards(id) ON DELETE CASCADE,
    FOREIGN KEY (board_id, column_id) REFERENCES kanban_columns(board_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_kanban_workspace
    ON kanban_boards(workspace_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_column
    ON kanban_cards(board_id, column_id, position);
`;

module.exports = kanbanSchema;
