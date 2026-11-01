const db = require('../../db');
const { queryRows, validateWorkspace } = require('./shared');

// Suggest tags already used by saved cards in this workspace.
async function fetchTagSuggestions(connection, workspaceId) {
    const tags = await queryRows(
        connection,
        `SELECT DISTINCT tag.value COLLATE NOCASE AS name
        FROM kanban_cards AS card
        JOIN kanban_boards AS board ON board.id = card.board_id,
            json_each(card.tags_json) AS tag
        WHERE board.workspace_id = ? ORDER BY name COLLATE NOCASE`,
        [workspaceId],
    );
    return tags.map((tag) => tag.name);
}

// Fetch workspace notes available for linking to cards.
async function fetchLinkableNotes(connection, workspaceId) {
    return queryRows(
        connection,
        `SELECT notes.id, notes.title, notes.folder_id, folders.name AS folder_name
        FROM notes LEFT JOIN folders ON folders.id = notes.folder_id
        WHERE notes.workspace_id = ? ORDER BY notes.title COLLATE NOCASE, notes.id`,
        [workspaceId],
    );
}

// Combine the selectable card-field options for this workspace.
async function fetchCardOptions(connection, workspaceId) {
    const tags = await fetchTagSuggestions(connection, workspaceId);
    const notes = await fetchLinkableNotes(connection, workspaceId);
    return { tags, notes };
}

async function getOptions({ workspaceId }) {
    await db.ready;
    return fetchCardOptions(db, validateWorkspace(workspaceId));
}

module.exports = {
    fetchTagSuggestions,
    fetchLinkableNotes,
    fetchCardOptions,
    getOptions,
};
