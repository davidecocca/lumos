const {
    executeStatement,
    queryRows,
    validateText,
    executeBoardMutation,
} = require('./shared');

// Allowed semantic progress types, independent of column names.
const PROGRESS_TYPES = ['not-started', 'active', 'blocked', 'complete'];

// Add a column to a board.
async function addColumn(connection, boardId, column, position) {
    const result = await executeStatement(
        connection,
        'INSERT INTO kanban_columns (board_id, name, progress_type, position) VALUES (?, ?, ?, ?)',
        [boardId, column.name, column.progressType, position],
    );
    return result.lastID;
}

// Save the columns for a board, creating, updating, or deleting as needed.
function saveColumns(payload) {
    const columns = payload.columns;
    if (!columns.length || columns.length > 50)
        throw new Error('A board must have between 1 and 50 columns.');

    const ids = new Set();
    const normalized = columns.map((column) => {
        if (ids.has(column.id))
            throw new Error('Duplicate column ID.');

        ids.add(column.id);
        if (!PROGRESS_TYPES.includes(column.progressType))
            throw new Error('Choose a valid progress type.');

        return {
            ...column,
            name: validateText(column.name, 'Column name', 80),
        };
    });

    return executeBoardMutation(payload, async (connection) => {
        const previous = await queryRows(
            connection,
            'SELECT * FROM kanban_columns WHERE board_id = ?',
            [payload.id],
        );
        const oldColumns = new Map(
            previous.map((column) => [column.id, column]),
        );
        for (const column of previous) {
            if (ids.has(column.id))
                continue;

            const [count] = await queryRows(
                connection,
                'SELECT COUNT(*) AS total FROM kanban_cards WHERE board_id = ? AND column_id = ?',
                [payload.id, column.id],
            );
            if (count.total)
                throw new Error('Move the cards before deleting their column.');

            await executeStatement(
                connection,
                'DELETE FROM kanban_columns WHERE board_id = ? AND id = ?',
                [payload.id, column.id],
            );
        }

        const now = new Date().toISOString();
        for (const [position, column] of normalized.entries()) {
            const old = oldColumns.get(column.id);
            if (column.id < 0)
                await addColumn(connection, payload.id, column, position);
            else if (!old)
                throw new Error('Column not found in this board.');
            else if (
                old.name !== column.name ||
                old.progress_type !== column.progressType ||
                old.position !== position
            ) {
                await executeStatement(
                    connection,
                    'UPDATE kanban_columns SET name = ?, progress_type = ?, position = ? WHERE board_id = ? AND id = ?',
                    [
                        column.name,
                        column.progressType,
                        position,
                        payload.id,
                        column.id,
                    ],
                );
                if (old.progress_type !== column.progressType) {
                    // Changing a column's progress type affects only its cards.
                    await executeStatement(
                        connection,
                        `UPDATE kanban_cards SET updated_at = ?, completed_at = ? WHERE board_id = ? AND column_id = ?`,
                        [
                            now,
                            column.progressType === 'complete' ? now : null,
                            payload.id,
                            column.id,
                        ],
                    );
                }
            }
        }
    });
}

module.exports = { addColumn, saveColumns };
