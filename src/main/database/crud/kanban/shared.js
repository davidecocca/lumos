const sqlite3 = require('sqlite3');
const db = require('../../db');
const { getActiveWorkspaceId } = require('../../../workspaceContext');

// Validate that a text value is non-empty and does not exceed the maximum length.
function validateText(value, label, max) {
    const text = value.trim();
    if (!text || text.length > max)
        throw new Error(`${label} must be between 1 and ${max} characters.`);
    return text;
}

// Validate that the workspace ID matches the active workspace.
// It happens when a Kanban request carries a workspace ID different from the currently active workspace. For example:
// 1. You open a board in workspace A.
// 2. You switch to workspace B.
// 3. A delayed autosave or queued action from A reaches the main process.
// The check rejects that stale action rather than letting it operate after the workspace switch.
function validateWorkspace(id) {
    if (id !== getActiveWorkspaceId())
        throw new Error('The workspace has changed. Reopen your board.');
    return id;
}

// Execute SQL without returning rows; resolve with SQLite metadata (lastID, changes).
function executeStatement(connection, sql, params = []) {
    return new Promise((resolve, reject) => {
        connection.run(sql, params, function (error) {
            if (error) reject(error);
            else resolve(this);
        });
    });
}

// Query SQL and resolve with an array of rows, or [] when nothing matches.
function queryRows(connection, sql, params = []) {
    return new Promise((resolve, reject) => {
        connection.all(sql, params, (error, rows) =>
            error ? reject(error) : resolve(rows),
        );
    });
}

// Execute a database operation in a transaction. If the operation throws, rollback the transaction and rethrow the error.
async function executeTransaction(operation, write = true) {
    await db.ready;
    const connection = await new Promise((resolve, reject) => {
        const opened = new sqlite3.Database(db.filename, (error) =>
            error ? reject(error) : resolve(opened),
        );
    });
    connection.configure('busyTimeout', 5000);
    try {
        await executeStatement(connection, 'PRAGMA foreign_keys = ON');
        await executeStatement(connection, write ? 'BEGIN IMMEDIATE' : 'BEGIN');
        try {
            const result = await operation(connection);
            await executeStatement(connection, 'COMMIT');
            return result;
        } catch (error) {
            await executeStatement(connection, 'ROLLBACK');
            throw error;
        }
    } finally {
        await new Promise((resolve, reject) =>
            connection.close((error) => (error ? reject(error) : resolve())),
        );
    }
}

// Read a board and its columns and cards from the database. Throws if the board is not found in the workspace.
async function fetchBoardWithDetails(connection, workspaceId, id) {
    const [board] = await queryRows(
        connection,
        'SELECT * FROM kanban_boards WHERE id = ? AND workspace_id = ?',
        [id, workspaceId],
    );
    if (!board) throw new Error('Board not found in this workspace.');
    board.columns = await queryRows(
        connection,
        'SELECT id, name, progress_type AS progressType FROM kanban_columns WHERE board_id = ? ORDER BY position',
        [id],
    );
    board.cards = (
        await queryRows(
            connection,
            'SELECT * FROM kanban_cards WHERE board_id = ? ORDER BY position',
            [id],
        )
    ).map(toCardObject);
    return board;
}

// Map a database row to a card object.
function toCardObject(row) {
    return {
        id: row.id,
        title: row.title,
        columnId: row.column_id,
        description: JSON.parse(row.description_json),
        dueDate: row.due_date,
        priority: row.priority,
        tags: JSON.parse(row.tags_json),
        noteIds: JSON.parse(row.note_ids_json),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        completedAt: row.completed_at,
    };
}

// Common wrapper for changing an existing board or its columns/cards.
// Any failure rolls back all writes, including the timestamp.
function executeBoardMutation(payload, operation) {
    // 1. Validate the active workspace.
    const scope = validateWorkspace(payload.workspaceId);
    // 2. Start a transaction, check board ownership, and update its timestamp.
    return executeTransaction(async (connection) => {
        // 3. Apply the supplied operation.
        const result = await executeStatement(
            connection,
            `UPDATE kanban_boards SET updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?`,
            [payload.id, scope],
        );
        if (!result.changes)
            throw new Error('Board not found in this workspace.');
        await operation(connection, scope);
        // 4. Load the board with its columns and cards, then commit and return it.
        return fetchBoardWithDetails(connection, scope, payload.id);
    });
}

module.exports = {
    validateText,
    validateWorkspace,
    executeStatement,
    queryRows,
    executeTransaction,
    fetchBoardWithDetails,
    toCardObject,
    executeBoardMutation,
};
