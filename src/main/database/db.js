const sqlite3 = require('sqlite3').verbose();

// Open (or create) the database file
const db = new sqlite3.Database('./lumos.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Create tables (folders and notes) without nested folders, with favorite flag and last_viewed_at
db.serialize(() => {
  // Folders table (no nested folders)
  db.run(`
    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )
  `, (err) => {
    if (err) console.error('Error creating folders table:', err.message);
    else console.log('Folders table ready.');
  });
  
  // Notes table with additional fields
  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folder_id INTEGER,
      title TEXT NOT NULL,
      topic TEXT,
      content_json TEXT NOT NULL,
      content_text TEXT NOT NULL,
      favorite INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (folder_id) REFERENCES folders(id)
    )
  `, (err) => {
    if (err) console.error('Error creating notes table:', err.message);
    else console.log('Notes table ready.');
  });

  // FTS5 virtual table for full-text search on notes
  db.run(`
    CREATE VIRTUAL TABLE IF NOT EXISTS note_search_fts USING fts5(
      title,
      topic,
      content_text,
      note_id UNINDEXED,
      tokenize = 'unicode61'
    )
  `, (err) => {
    if (err) console.error('Error creating note search FTS table:', err.message);
    else console.log('Note search FTS table ready.');
  });

  // Tracks which notes are up to date in the vector index (background RAG queue)
  db.run(`
    CREATE TABLE IF NOT EXISTS vector_sync (
      note_id INTEGER PRIMARY KEY,
      synced_at TEXT NOT NULL
    )
  `, (err) => {
    if (err) console.error('Error creating vector_sync table:', err.message);
    else console.log('Vector sync table ready.');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scope TEXT NOT NULL CHECK (scope IN ('all', 'note')),
      note_id INTEGER,
      title TEXT NOT NULL DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (note_id) REFERENCES notes(id)
    )
  `, (err) => {
    if (err) console.error('Error creating chat conversations table:', err.message);
    else console.log('Chat conversations table ready.');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      sources_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id)
    )
  `, (err) => {
    if (err) console.error('Error creating chat messages table:', err.message);
    else console.log('Chat messages table ready.');
  });

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_chat_conversations_scope_updated
    ON chat_conversations(scope, updated_at)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_chat_conversations_note_updated
    ON chat_conversations(note_id, updated_at)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
    ON chat_messages(conversation_id, created_at)
  `);
});

module.exports = db;
