const db = require('../../db');
const {
    executeStatement,
    queryRows,
    validateWorkspace,
    validateText,
    executeTransaction,
    fetchBoardWithDetails,
    executeBoardMutation,
} = require('./shared');
const { addColumn } = require('./columns');
const { writeCard } = require('./cards');
const { fetchCardOptions } = require('./options');

// Starter columns for new boards, each assigned a progress type.
const DEFAULT_COLUMNS = [
    { name: 'To do', progressType: 'not-started' },
    { name: 'In progress', progressType: 'active' },
    { name: 'Blocked', progressType: 'blocked' },
    { name: 'In review', progressType: 'active' },
    { name: 'Done', progressType: 'complete' },
];

// List all boards in this workspace, including their card counts.
async function list({ workspaceId }) {
    await db.ready;
    return queryRows(
        db,
        `SELECT board.id, board.name, board.updated_at,
        (SELECT COUNT(*) FROM kanban_cards WHERE board_id = board.id) AS card_count
        FROM kanban_boards AS board WHERE workspace_id = ?
        ORDER BY updated_at DESC, name COLLATE NOCASE, id`,
        [validateWorkspace(workspaceId)],
    );
}

// Get a board with its columns and cards, throwing if the board is not found in the workspace.
function get({ workspaceId, id }) {
    const scope = validateWorkspace(workspaceId);
    return executeTransaction(
        (connection) => fetchBoardWithDetails(connection, scope, id),
        false,
    );
}

// Create a new board with default columns, returning the new board with its columns and cards.
function create({ workspaceId, name }) {
    const scope = validateWorkspace(workspaceId);
    const title = validateText(name, 'Board name', 120);
    return executeTransaction(async (connection) => {
        const result = await executeStatement(
            connection,
            'INSERT INTO kanban_boards (workspace_id, name) VALUES (?, ?)',
            [scope, title],
        );
        const id = result.lastID;
        for (const [position, column] of DEFAULT_COLUMNS.entries())
            await addColumn(connection, id, column, position);

        return fetchBoardWithDetails(connection, scope, id);
    });
}

// Rename a board, returning the refreshed board with its columns and cards.
function rename(payload) {
    const name = validateText(payload.name, 'Board name', 120);
    return executeBoardMutation(payload, (connection) =>
        executeStatement(
            connection,
            'UPDATE kanban_boards SET name = ? WHERE id = ?',
            [name, payload.id],
        ),
    );
}

// Duplicate a board with its columns and cards, returning the new board with its columns and cards.
function duplicate(payload) {
    const scope = validateWorkspace(payload.workspaceId);
    return executeTransaction(async (connection) => {
        const original = await fetchBoardWithDetails(
            connection,
            scope,
            payload.id,
        );
        const options = await fetchCardOptions(connection, scope);
        const result = await executeStatement(
            connection,
            'INSERT INTO kanban_boards (workspace_id, name) VALUES (?, ?)',
            [scope, `${original.name.slice(0, 113)} (copy)`],
        );
        const id = result.lastID;
        const columnIds = new Map();
        for (const [position, column] of original.columns.entries()) {
            const columnId = await addColumn(
                connection,
                id,
                column,
                position,
            );
            columnIds.set(column.id, columnId);
        }
        const now = new Date().toISOString();
        for (const [position, card] of original.cards.entries()) {
            const column = original.columns.find(
                (column) => column.id === card.columnId,
            );
            await writeCard(
                connection,
                id,
                {
                    ...card,
                    columnId: columnIds.get(card.columnId),
                    noteIds: card.noteIds.filter((id) =>
                        options.notes.some((note) => note.id === id),
                    ),
                    createdAt: now,
                    updatedAt: now,
                    completedAt:
                        column.progressType === 'complete' ? now : null,
                },
                position,
                true,
            );
        }
        return fetchBoardWithDetails(connection, scope, id);
    });
}

// Delete a board, throwing if the board is not found in the workspace.
function deleteBoard(payload) {
    const scope = validateWorkspace(payload.workspaceId);
    return executeTransaction(async (connection) => {
        const result = await executeStatement(
            connection,
            'DELETE FROM kanban_boards WHERE id = ? AND workspace_id = ?',
            [payload.id, scope],
        );
        if (!result.changes)
            throw new Error('Board not found in this workspace.');
    });
}

module.exports = { list, get, create, rename, duplicate, deleteBoard };
