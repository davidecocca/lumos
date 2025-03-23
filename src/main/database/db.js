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
      content_json TEXT NOT NULL,
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
});

module.exports = db;
