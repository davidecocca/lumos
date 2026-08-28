const vectorStore = require("../database/vectorStore");

// Background worker that keeps LanceDB synchronized with SQLite notes.
// Its main purpose is: save the note immediately, create embeddings later.
//
// Note saves resolve as soon as SQLite commits; embedding work happens here,
// off the critical path, one note at a time (latest state wins: each job
// re-reads the note from SQLite right before embedding it).
//
// Sync tracking lives in the SQLite `vector_sync` table: a note whose
// updated_at is newer than its synced_at (or that has no row) gets re-indexed
// on startup. Full rebuilds clear that table so every note re-queues.
//
// Vector index synchronization flow:
// 1. Save the note to SQLite.
// 2. Queue the note ID for indexing.
// 3. Read the latest version of the note from SQLite.
// 4. Delete any existing vectors associated with the note.
// 5. Chunk the note and generate new embeddings.
// 6. Store the new vectors in LanceDB.
// 7. Record the synchronization timestamp in vector_sync.

const interJobDelayMs = 250;
const maxAttempts = 3;
const retryDelayMs = 1500;

class VectorIndexer {
    constructor() {
        this.pendingIds = new Set();    // Coalescing: use a Set to avoid duplicate note IDs in the queue.
        this.processing = false;
        this.statusListeners = new Set();
        this.lastError = null;
    }

    /**
     * Queue a note for (re)indexing. Safe to call repeatedly: the note is
     * processed once with its freshest SQLite state.
     * @param {number|string} noteId
     */
    requestIndex(noteId) {
        const id = Number(noteId);
        if (!Number.isFinite(id)) return;

        const wasEmpty = this.pendingIds.size === 0;
        this.pendingIds.add(id);
        if (wasEmpty || !this.processing) {
            this.notifyStatus();
            this.processQueue();
        }
    }

    // Status listener
    // Let main.js subscribe once and broadcast queue updates to renderer windows
    onStatus(listener) {
        this.statusListeners.add(listener);
        return () => this.statusListeners.delete(listener);
    }

    notifyStatus() {
        const status = this.getQueueStatus();
        for (const listener of this.statusListeners) {
            try {
                listener(status);
            } catch {
                // Listener errors must never break indexing.
            }
        }
    }

    getQueueStatus() {
        return {
            indexing: this.processing || this.pendingIds.size > 0,
            pending: this.pendingIds.size + (this.processing ? 1 : 0),
            lastError: this.lastError ? String(this.lastError.message || this.lastError) : null,
        };
    }

    async processQueue() {
        if (this.processing) return;    // Only one worker runs
        this.processing = true;
        this.notifyStatus();

        try {
            while (this.pendingIds.size > 0) {
                const noteId = this.pendingIds.values().next().value;
                this.pendingIds.delete(noteId);

                try {
                    await this.indexNote(noteId);
                    this.lastError = null;
                } catch (err) {
                    this.lastError = err;
                    console.error(`Failed to index note ${noteId}:`, err.message);
                }

                if (this.pendingIds.size > 0) {
                    await new Promise((resolve) => setTimeout(resolve, interJobDelayMs));
                }
            }
        // Always clear the processing flag, so indexer cannot be permanently stuck in the "currently processing" state.
        } finally {
            this.processing = false;
            this.notifyStatus();
        }
    }

    // Index a single note by reading its latest state from SQLite, deleting any existing vectors, and creating new embeddings.
    async indexNote(noteId, attempt = 1) {
        // Lazy require: crud.js imports this module, so requiring it at the top
        // would create a circular dependency.
        const crud = require("../database/crud");

        let note = null;
        try {
            // Latest state wins rule:
            // Read the note from SQLite right before embedding it, so we always embed the freshest content.
            note = await new Promise((resolve, reject) => {
                crud.getNoteRawForIndexing(noteId, (err, row) => err ? reject(err) : resolve(row));
            });
        } catch (err) {
            throw err;
        }

        if (!note) {
            // Note was deleted while queued: just drop any stale vectors.
            await this.safeDeleteVectors(noteId);
            return;
        }

        if (!note.content_text || note.content_text.trim().length === 0) {
            // Nothing to embed (e.g. brand-new empty note), but mark it synced
            // so startup reconciliation doesn't requeue it forever.
            await this.safeDeleteVectors(noteId);
            await this.markSynced(noteId, note.updated_at);
            return;
        }

        try {
            await vectorStore.deleteNote(noteId);
            await vectorStore.addNote(noteId, note.content_text, note.title);
            await this.markSynced(noteId, note.updated_at);
        } catch (err) {
            // An indexing failure gets up to three attempts:
            // First failure -> wait 1.5 seconds, then retry.
            // Second failure -> wait 3 seconds, then retry.
            // Third failure -> give up and log the error.
            if (attempt < maxAttempts) {
                await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt));
                return this.indexNote(noteId, attempt + 1);
            }
            // No sync row written: startup reconciliation will retry later.
            throw err;
        }
    }

    async safeDeleteVectors(noteId) {
        if (!vectorStore.ready) return;
        try {
            await vectorStore.deleteNote(noteId);
        } catch {
            // Stale vectors without a note are harmless (filtered out on read).
        }
    }

    async markSynced(noteId, updatedAt) {
        const crud = require("../database/crud");
        await new Promise((resolve, reject) => {
            crud.setNoteVectorSynced(noteId, updatedAt, (err) => err ? reject(err) : resolve());
        });
    }

    // At startup, asks SQLite for notes that are:  
    // - missing a vector_sync row
    // - or newer than their recorded synced_at
    // And re-queues them for indexing.
    /**
     * Re-queue every note that is missing or stale in the vector index.
     * @returns {Promise<number>} number of notes queued
     */
    async reconcile() {
        const crud = require("../database/crud");
        const noteIds = await new Promise((resolve, reject) => {
            crud.getNotesNeedingVectorSync((err, rows) => {
                if (err) reject(err);
                else resolve((rows || []).map((row) => row.id));
            });
        });

        for (const id of noteIds) {
            this.requestIndex(id);
        }

        if (noteIds.length > 0) {
            console.log(`Vector index: ${noteIds.length} note(s) queued for indexing.`);
        }
        return noteIds.length;
    }

    /**
     * Clear all sync markers (after a full index rebuild) and re-queue everything.
     */
    async rebuildAll() {
        const crud = require("../database/crud");
        await new Promise((resolve, reject) => {
            crud.clearVectorSync((err) => err ? reject(err) : resolve());
        });
        return this.reconcile();
    }

    /**
     * Aggregate status for the settings UI.
     */
    async getStatus() {
        const crud = require("../database/crud");
        const stats = await new Promise((resolve, reject) => {
            crud.getVectorSyncStats((err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        }).catch(() => ({ indexedCount: 0, totalNotes: 0 }));

        return {
            ready: Boolean(vectorStore.ready),
            error: vectorStore.lastError
                ? String(vectorStore.lastError.message || vectorStore.lastError)
                : this.lastError
                    ? String(this.lastError.message || this.lastError)
                    : null,
            ...this.getQueueStatus(),
            indexedCount: stats.indexedCount || 0,
            totalNotes: stats.totalNotes || 0,
        };
    }
}

module.exports = new VectorIndexer();
