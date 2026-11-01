const db = require('../../db');
const { getActiveWorkspaceId } = require('../../../workspaceContext');

// Normalize text before storing/indexing it
function normalizeSearchText(value) {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Turn the user search query into safe FTS terms
function getSearchTokens(query) {
    const matches =
        String(query || '')
            .normalize('NFKC')
            .toLowerCase()
            .match(/[\p{L}\p{N}_]+/gu) || [];
    return [...new Set(matches)].slice(0, 8);
}

// Delete a note from the FTS index
function deleteNoteSearchIndex(noteId) {
    return new Promise((resolve, reject) => {
        db.run(
            `DELETE FROM note_search_fts WHERE rowid = ?`,
            [noteId],
            (err) => {
                if (err) reject(err);
                else resolve();
            },
        );
    });
}

// Update or insert a note into the FTS index
function updateNoteSearchIndex(note) {
    return new Promise((resolve, reject) => {
        db.run(
            `DELETE FROM note_search_fts WHERE rowid = ?`,
            [note.id],
            (deleteErr) => {
                if (deleteErr) {
                    reject(deleteErr);
                    return;
                }

                db.run(
                    `
                INSERT INTO note_search_fts(rowid, title, topic, content_text, note_id)
                VALUES (?, ?, ?, ?, ?)
            `,
                    [
                        note.id,
                        note.title || '',
                        note.topic || '',
                        note.content_text || '',
                        note.id,
                    ],
                    (insertErr) => {
                        if (insertErr) reject(insertErr);
                        else resolve();
                    },
                );
            },
        );
    });
}

// Refresh the FTS index for a note
function refreshNoteSearchIndex(noteId) {
    return new Promise((resolve, reject) => {
        db.get(
            `
            SELECT id, title, topic, content_text
            FROM notes
            WHERE id = ?
        `,
            [noteId],
            async (err, note) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (!note) {
                    resolve();
                    return;
                }

                try {
                    await updateNoteSearchIndex(note);
                    resolve();
                } catch (searchErr) {
                    reject(searchErr);
                }
            },
        );
    });
}

// Search notes by keyword across title, topic, and plain note content
function searchNotes(query, limit = 10, callback) {
    const searchTerms = getSearchTokens(query);
    const safeLimit = Math.max(1, Number(limit) || 10);

    if (searchTerms.length === 0) {
        callback(null, []);
        return;
    }

    const ftsQuery = searchTerms.map((term) => `${term}*`).join(' ');
    const sql = `
    SELECT
        notes.id,
        notes.title,
        notes.topic,
        notes.favorite,
        notes.folder_id,
        notes.updated_at,
        notes.last_viewed_at,
        folders.name AS folder_name,
        -bm25(note_search_fts, 8.0, 4.0, 1.0, 0.0) AS keyword_score
    FROM note_search_fts
    JOIN notes ON notes.id = note_search_fts.note_id
    LEFT JOIN folders ON notes.folder_id = folders.id
             WHERE note_search_fts MATCH ? AND notes.workspace_id = ?
    ORDER BY keyword_score DESC,
             COALESCE(notes.last_viewed_at, notes.updated_at) DESC,
             notes.title ASC
    LIMIT ?
    `;

    db.all(sql, [ftsQuery, getActiveWorkspaceId(), safeLimit], (err, rows) => {
        callback(err, rows);
    });
}

module.exports = {
    normalizeSearchText,
    deleteNoteSearchIndex,
    updateNoteSearchIndex,
    refreshNoteSearchIndex,
    searchNotes,
};
