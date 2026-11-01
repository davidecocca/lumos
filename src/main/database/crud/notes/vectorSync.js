const db = require('../../db');
const { getActiveWorkspaceId } = require('../../../workspaceContext');

// Delete a note's row from the vector sync tracker
function deleteNoteVectorSyncRow(noteId) {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM vector_sync WHERE note_id = ?`, [noteId], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

// Mark a note as up to date in the vector index
function setNoteVectorSynced(noteId, syncedAt, callback) {
    db.run(
        `
        INSERT INTO vector_sync (note_id, synced_at)
        VALUES (?, ?)
        ON CONFLICT(note_id) DO UPDATE SET synced_at = excluded.synced_at
    `,
        [noteId, syncedAt || null],
        function (err) {
            callback(err, this ? this.changes : 0);
        },
    );
}

// Notes missing or stale in the vector index
function getNotesNeedingVectorSync(callback) {
    db.all(
        `
        SELECT n.id
        FROM notes n
        LEFT JOIN vector_sync vs ON vs.note_id = n.id
        WHERE vs.note_id IS NULL OR COALESCE(vs.synced_at, '') < n.updated_at
    `,
        [],
        (err, rows) => {
            callback(err, rows);
        },
    );
}

// Raw note fields needed by the background indexer
function getNoteRawForIndexing(noteId, callback) {
    db.get(
        `
            SELECT id, title, topic, content_text, updated_at, workspace_id
        FROM notes
        WHERE id = ?
    `,
        [noteId],
        (err, row) => {
            callback(err, row);
        },
    );
}

// Reset all vector sync markers (used after a full index rebuild)
function clearVectorSync(callback) {
    db.run(`DELETE FROM vector_sync`, [], function (err) {
        callback(err, this ? this.changes : 0);
    });
}

// Counts for the RAG index status UI
function getVectorSyncStats(callback) {
    db.get(
        `
        SELECT
            (SELECT COUNT(*) FROM notes WHERE workspace_id = ?) AS totalNotes,
            (SELECT COUNT(*) FROM vector_sync WHERE note_id IN (
                SELECT id FROM notes WHERE workspace_id = ?
            )) AS indexedCount
    `,
        [getActiveWorkspaceId(), getActiveWorkspaceId()],
        (err, row) => {
            callback(err, row || { indexedCount: 0, totalNotes: 0 });
        },
    );
}

module.exports = {
    deleteNoteVectorSyncRow,
    getNoteRawForIndexing,
    setNoteVectorSynced,
    getNotesNeedingVectorSync,
    clearVectorSync,
    getVectorSyncStats,
};
