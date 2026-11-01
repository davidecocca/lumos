const {
    executeStatement,
    queryRows,
    validateText,
    toCardObject,
    executeBoardMutation,
} = require('./shared');
const { fetchCardOptions } = require('./options');

// Allowed card priorities.
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

// Validate a card due date string, returning null for empty values.
function validateCardDueDate(value) {
    if (value === null || value === '')
        return null;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '0001-01-01')
        throw new Error('Choose a valid due date.');

    const date = new Date(`${value}T00:00:00Z`);
    if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value
    )
        throw new Error('Choose a valid due date.');

    return value;
}

// Prepares and validates a card before saving it.
async function normalizeCard(connection, workspaceId, boardId, card, old) {
    const [column] = await queryRows(
        connection,
        'SELECT progress_type FROM kanban_columns WHERE board_id = ? AND id = ?',
        [boardId, card.columnId],
    );

    if (!column)
        throw new Error('Card column does not exist.');

    const title = validateText(card.title, 'Card title', 240);
    const description = JSON.stringify(card.description);
    if (description.length > 50000)
        throw new Error('Card description must be at most 50,000 characters.');

    const priority =
        card.priority === undefined ? (old?.priority ?? null) : card.priority;
    if (priority !== null && !PRIORITIES.includes(priority))
        throw new Error('Choose a valid priority.');

    const options = await fetchCardOptions(connection, workspaceId);
    const knownTags = new Map(
        options.tags.map((tag) => [tag.toLowerCase(), tag]),
    );
    const inputTags = card.tags === undefined ? (old?.tags ?? []) : card.tags;
    if (inputTags.length > 20)
        throw new Error('A card can have up to 20 tags.');

    const tags = [
        ...new Set(
            inputTags.map((value) => {
                const tag = validateText(value, 'Tag', 40);
                const key = tag.toLowerCase();
                if (!knownTags.has(key))
                    knownTags.set(key, tag);
                return knownTags.get(key);
            }),
        ),
    ];
    const links =
        card.noteIds === undefined ? (old?.noteIds ?? []) : card.noteIds;
    if (links.length > 50)
        throw new Error('Choose up to 50 valid linked notes.');

    const noteIds = [...new Set(links)].filter((id) => {
        if (options.notes.some((note) => note.id === id))
            return true;
        if (old?.noteIds.includes(id))
            return false;
        throw new Error('Linked note not found in this workspace.');
    });

    const details = {
        id: card.id,
        title,
        columnId: card.columnId,
        description: card.description,
        dueDate: validateCardDueDate(
            card.dueDate === undefined ? (old?.dueDate ?? null) : card.dueDate,
        ),
        priority,
        tags,
        noteIds,
    };
    const now = new Date().toISOString();
    const previousDetails =
        old &&
        Object.fromEntries(Object.keys(details).map((key) => [key, old[key]]));
    const changed =
        !old || JSON.stringify(details) !== JSON.stringify(previousDetails);
    const [oldColumn] = old
        ? await queryRows(
              connection,
              'SELECT progress_type FROM kanban_columns WHERE board_id = ? AND id = ?',
              [boardId, old.columnId],
          )
        : [];
    return {
        ...details,
        createdAt: old ? old.createdAt : now,
        updatedAt: changed ? now : old.updatedAt,
        completedAt:
            column.progress_type === 'complete'
                ? oldColumn?.progress_type === 'complete'
                    ? old.completedAt
                    : now
                : null,
    };
}

// Low-level SQL helper: inserts or updates a card row using already-prepared data and returns its ID.
async function writeCard(connection, boardId, card, position, insert) {
    const values = [
        card.columnId,
        card.title,
        JSON.stringify(card.description),
        card.dueDate,
        card.priority,
        JSON.stringify(card.tags),
        JSON.stringify(card.noteIds),
        position,
        card.createdAt,
        card.updatedAt,
        card.completedAt,
        boardId,
        card.id,
    ];
    if (insert) {
        const result = await executeStatement(
            connection,
            `INSERT INTO kanban_cards
        (column_id, title, description_json, due_date, priority, tags_json, note_ids_json, position, created_at, updated_at, completed_at, board_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            values.slice(0, -1),
        );
        return result.lastID;
    } else {
        await executeStatement(
            connection,
            `UPDATE kanban_cards SET column_id = ?, title = ?, description_json = ?, due_date = ?, priority = ?,
        tags_json = ?, note_ids_json = ?, position = ?, created_at = ?, updated_at = ?, completed_at = ? WHERE board_id = ? AND id = ?`,
            values,
        );
        return card.id;
    }
}

// Reposition a card before the target card, or at the end of the board if null.
// Update only affected positions; leave columns and timestamps unchanged.
async function repositionCard(connection, boardId, cardId, beforeId = null) {
    const rows = await queryRows(
        connection,
        'SELECT id, position FROM kanban_cards WHERE board_id = ? ORDER BY position',
        [boardId],
    );
    const ids = rows.map((row) => row.id).filter((id) => id !== cardId);
    const index = beforeId === null ? -1 : ids.indexOf(beforeId);
    ids.splice(index < 0 ? ids.length : index, 0, cardId);
    const positions = new Map(rows.map((row) => [row.id, row.position]));
    for (const [position, id] of ids.entries()) {
        if (positions.get(id) !== position)
            await executeStatement(
                connection,
                'UPDATE kanban_cards SET position = ? WHERE board_id = ? AND id = ?',
                [position, boardId, id],
            );
    }
}

// Starts a board mutation transaction, loads the existing card, validates/prepares data through normalizeCard(),
// calls writeCard(), handles reordering, and returns the refreshed board.
function saveCard(payload) {
    return executeBoardMutation(payload, async (connection, scope) => {
        const [row] = await queryRows(
            connection,
            'SELECT * FROM kanban_cards WHERE board_id = ? AND id = ?',
            [payload.id, payload.card.id],
        );
        const old = row && toCardObject(row);

        if (payload.card.id != null && !old)
            throw new Error('Card not found in this board.');

        if (!old) {
            const [count] = await queryRows(
                connection,
                'SELECT COUNT(*) AS total FROM kanban_cards WHERE board_id = ?',
                [payload.id],
            );
            if (count.total >= 10000)
                throw new Error('A board can have up to 10,000 cards.');
        }
        const card = await normalizeCard(
            connection,
            scope,
            payload.id,
            payload.card,
            old,
        );
        const [last] = await queryRows(
            connection,
            'SELECT COALESCE(MAX(position), -1) + 1 AS position FROM kanban_cards WHERE board_id = ?',
            [payload.id],
        );
        const cardId = await writeCard(
            connection,
            payload.id,
            card,
            row?.position ?? last.position,
            !row,
        );
        if (
            payload.beforeId !== undefined ||
            (old && old.columnId !== card.columnId)
        )
            await repositionCard(
                connection,
                payload.id,
                cardId,
                payload.beforeId ?? null,
            );
    });
}

// Move a card within or between columns in one board mutation transaction,
// updating completion state and position, then returning the refreshed board.
function moveCard(payload) {
    return executeBoardMutation(payload, async (connection) => {
        // 1. Load the card from this board before validating the move.
        const [row] = await queryRows(
            connection,
            'SELECT * FROM kanban_cards WHERE board_id = ? AND id = ?',
            [payload.id, payload.cardId],
        );
        if (!row)
            throw new Error('Card not found.');

        // 2. Skip card changes when dropping a card before itself.
        if (payload.beforeId === payload.cardId)
            return;

        // 3. Validate the destination column and optional target card.
        const [target] = await queryRows(
            connection,
            'SELECT progress_type FROM kanban_columns WHERE board_id = ? AND id = ?',
            [payload.id, payload.columnId],
        );
        if (!target)
            throw new Error('Card column does not exist.');
        if (payload.beforeId != null) {
            const [before] = await queryRows(
                connection,
                'SELECT id FROM kanban_cards WHERE board_id = ? AND column_id = ? AND id = ?',
                [payload.id, payload.columnId, payload.beforeId],
            );
            if (!before)
                throw new Error('Move target not found in this column.');
        }

        // 4. Update the column and timestamps only when changing columns.
        if (row.column_id !== payload.columnId) {
            const [source] = await queryRows(
                connection,
                'SELECT progress_type FROM kanban_columns WHERE board_id = ? AND id = ?',
                [payload.id, row.column_id],
            );
            const now = new Date().toISOString();
            await executeStatement(
                connection,
                'UPDATE kanban_cards SET column_id = ?, updated_at = ?, completed_at = ? WHERE board_id = ? AND id = ?',
                [
                    payload.columnId,
                    now,
                    // Preserve completion between complete columns, set it on entry,
                    // and clear it when moving to a non-complete column.
                    target.progress_type === 'complete'
                        ? source.progress_type === 'complete'
                            ? row.completed_at
                            : now
                        : null,
                    payload.id,
                    payload.cardId,
                ],
            );
        }
        // 5. Place the card before the target, or at the end when no target is given.
        await repositionCard(
            connection,
            payload.id,
            payload.cardId,
            payload.beforeId ?? null,
        );
    });
}

// Delete a card using a board mutation transaction, returning the refreshed board.
function deleteCard(payload) {
    return executeBoardMutation(payload, async (connection) => {
        const result = await executeStatement(
            connection,
            'DELETE FROM kanban_cards WHERE board_id = ? AND id = ?',
            [payload.id, payload.cardId],
        );
        if (!result.changes)
            throw new Error('Card not found.');
    });
}

module.exports = { writeCard, saveCard, moveCard, deleteCard };
