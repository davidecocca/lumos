// Manages workspace lifecycle in Electron's main process. Workspace records and
// content live in SQLite, the active workspace is held in workspaceContext, and
// startup preferences are persisted locally in Electron's user-data directory.

const crypto = require('crypto');
// Get workspace icons and colors from shared resources
const workspaceIcons = require('../../shared/workspaceIcons.json');
const workspaceColors = require('../../shared/workspaceColors.json');
const fs = require('fs/promises');
const db = require('../database/db');
const vectorStore = require('../database/vectorStore');
const vectorIndexer = require('./vectorIndexer');
const imageService = require('./imageService');
const { getWorkspacePreferencesPath } = require('../storagePaths'); // Workspace preferences file is stored in Electron's user-data directory.
// Get workspace context
const {
    DEFAULT_WORKSPACE_ID,
    getActiveWorkspaceId,
    setActiveWorkspaceId,
} = require('../workspaceContext');
// Default workspace preferences
const DEFAULT_PREFERENCES = {
    startupMode: 'last-used',
    startupWorkspaceId: DEFAULT_WORKSPACE_ID,
    lastUsedWorkspaceId: DEFAULT_WORKSPACE_ID,
};
const DEFAULT_WORKSPACE_COLOR = 'primary';

let preferences = null;

// Wrap sqlite3's callback-based write API in a Promise.
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

// Wrap sqlite3's callback-based multi-row read API in a Promise.
function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

// Wrap sqlite3's callback-based single-row read API in a Promise.
function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row || null);
        });
    });
}

// Load and cache startup preferences, falling back to safe defaults.
async function loadPreferences() {
    if (preferences) return preferences;

    try {
        const saved = JSON.parse(
            await fs.readFile(getWorkspacePreferencesPath(), 'utf8'),
        );
        preferences = { ...DEFAULT_PREFERENCES, ...saved };
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.warn(
                'Could not load workspace preferences:',
                error.message,
            );
        }
        preferences = { ...DEFAULT_PREFERENCES };
    }

    return preferences;
}

// Atomically persist cached startup preferences in Electron's user-data directory via a temporary file, then rename.
async function savePreferences() {
    const preferencesPath = getWorkspacePreferencesPath();
    const temporaryPath = `${preferencesPath}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(
        temporaryPath,
        `${JSON.stringify(preferences, null, 2)}\n`,
    );
    await fs.rename(temporaryPath, preferencesPath);
}

// Fetch one workspace by ID.
async function getWorkspace(workspaceId) {
    await db.ready;
    return get(`SELECT * FROM workspaces WHERE id = ?`, [workspaceId]);
}

// List workspaces with the default workspace first.
async function listWorkspaces() {
    await db.ready;
    return all(
        `SELECT * FROM workspaces ORDER BY is_default DESC, name COLLATE NOCASE`,
    );
}

// Select the workspace to activate when the application starts.
async function initialize() {
    await db.ready;
    await loadPreferences();

    const workspaces = await listWorkspaces();
    const availableIds = new Set(workspaces.map((workspace) => workspace.id));
    const preferredId =
        preferences.startupMode === 'specific'
            ? preferences.startupWorkspaceId
            : preferences.lastUsedWorkspaceId;
    const workspaceId = availableIds.has(preferredId)
        ? preferredId
        : DEFAULT_WORKSPACE_ID;

    setActiveWorkspaceId(workspaceId);
    preferences.lastUsedWorkspaceId = workspaceId;
    if (
        preferences.startupMode === 'specific' &&
        !availableIds.has(preferences.startupWorkspaceId)
    ) {
        preferences.startupWorkspaceId = DEFAULT_WORKSPACE_ID;
    }
    await savePreferences();
    return getWorkspace(workspaceId);
}

// Reject icons outside the shared set of supported workspace icons.
function validateWorkspaceIcon(icon) {
    if (!workspaceIcons.includes(icon)) {
        throw new Error('Choose a valid workspace icon.');
    }
    return icon;
}

// Reject colors outside the shared set of supported workspace colors.
function validateWorkspaceColor(color) {
    if (!workspaceColors.includes(color)) {
        throw new Error('Choose a valid workspace color.');
    }
    return color;
}

// Create a uniquely named workspace with a validated icon and color.
async function createWorkspace(
    name,
    icon = 'ph-squares-four',
    color = DEFAULT_WORKSPACE_COLOR,
) {
    await db.ready;
    validateWorkspaceIcon(icon);
    validateWorkspaceColor(color);
    const normalizedName = String(name || '')
        .replace(/\s+/g, ' ')
        .trim();
    if (!normalizedName || normalizedName.length > 80) {
        throw new Error('Workspace name must be between 1 and 80 characters.');
    }

    const duplicate = await get(
        `SELECT id FROM workspaces WHERE lower(name) = lower(?)`,
        [normalizedName],
    );
    if (duplicate)
        throw new Error('A workspace with this name already exists.');

    const id = crypto.randomUUID();
    await run(
        `INSERT INTO workspaces (id, name, icon, color, is_default) VALUES (?, ?, ?, ?, 0)`,
        [id, normalizedName, icon, color],
    );
    return getWorkspace(id);
}

// Update a workspace's name, icon, and color while preserving omitted values.
async function renameWorkspace(workspaceId, name, icon, color) {
    await db.ready;
    const normalizedName = String(name || '')
        .replace(/\s+/g, ' ')
        .trim();
    if (!normalizedName || normalizedName.length > 80) {
        throw new Error('Workspace name must be between 1 and 80 characters.');
    }

    const workspace = await getWorkspace(workspaceId);
    if (!workspace) throw new Error('Workspace not found.');
    const workspaceIcon = validateWorkspaceIcon(icon ?? workspace.icon);
    const workspaceColor = validateWorkspaceColor(
        color ?? workspace.color ?? DEFAULT_WORKSPACE_COLOR,
    );
    const duplicate = await get(
        `SELECT id FROM workspaces WHERE lower(name) = lower(?) AND id <> ?`,
        [normalizedName, workspaceId],
    );
    if (duplicate)
        throw new Error('A workspace with this name already exists.');

    await run(
        `UPDATE workspaces SET name = ?, icon = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [normalizedName, workspaceIcon, workspaceColor, workspaceId],
    );
    return getWorkspace(workspaceId);
}

// Delete a non-active workspace and all local content associated with it.
async function deleteWorkspace(workspaceId) {
    await db.ready;
    const workspace = await getWorkspace(workspaceId);
    if (!workspace) throw new Error('Workspace not found.');
    if (workspace.is_default)
        throw new Error('The default workspace cannot be deleted.');
    if (workspace.id === getActiveWorkspaceId()) {
        throw new Error(
            'Switch to another workspace before deleting this one.',
        );
    }

    const notes = await all(`SELECT id FROM notes WHERE workspace_id = ?`, [
        workspaceId,
    ]);
    await Promise.all(
        notes.map(async ({ id }) => {
            await imageService.deleteNoteImages(id);
            if (vectorStore.ready)
                await vectorStore.deleteNote(id).catch(() => {});
        }),
    );

    await run('BEGIN TRANSACTION');
    try {
        await run(
            `DELETE FROM chat_messages WHERE conversation_id IN (SELECT id FROM chat_conversations WHERE workspace_id = ?)`,
            [workspaceId],
        );
        await run(`DELETE FROM chat_conversations WHERE workspace_id = ?`, [
            workspaceId,
        ]);
        await run(
            `DELETE FROM note_search_fts WHERE note_id IN (SELECT id FROM notes WHERE workspace_id = ?)`,
            [workspaceId],
        );
        await run(
            `DELETE FROM vector_sync WHERE note_id IN (SELECT id FROM notes WHERE workspace_id = ?)`,
            [workspaceId],
        );
        await run(`DELETE FROM notes WHERE workspace_id = ?`, [workspaceId]);
        await run(`DELETE FROM folders WHERE workspace_id = ?`, [workspaceId]);
        await run(`DELETE FROM workspaces WHERE id = ?`, [workspaceId]);
        await run('COMMIT');
    } catch (error) {
        await run('ROLLBACK').catch(() => {});
        throw error;
    }

    if (preferences.lastUsedWorkspaceId === workspaceId) {
        preferences.lastUsedWorkspaceId = DEFAULT_WORKSPACE_ID;
    }
    if (preferences.startupWorkspaceId === workspaceId) {
        preferences.startupWorkspaceId = DEFAULT_WORKSPACE_ID;
    }
    await savePreferences();
}

// Activate an existing workspace and record it as last used.
async function switchWorkspace(workspaceId) {
    const workspace = await getWorkspace(workspaceId);
    if (!workspace) throw new Error('Workspace not found.');

    setActiveWorkspaceId(workspace.id);
    await loadPreferences();
    preferences.lastUsedWorkspaceId = workspace.id;
    await savePreferences();
    return workspace;
}

// Return a copy of the cached startup preferences.
async function getPreferences() {
    await loadPreferences();
    return { ...preferences };
}

// Validate and persist the user's workspace startup preference.
async function setPreferences({ startupMode, startupWorkspaceId } = {}) {
    await loadPreferences();
    if (!['specific', 'last-used'].includes(startupMode)) {
        throw new Error('Invalid workspace startup mode.');
    }

    if (startupMode === 'specific') {
        const workspace = await getWorkspace(startupWorkspaceId);
        if (!workspace) throw new Error('Startup workspace not found.');
        preferences.startupWorkspaceId = workspace.id;
    }

    preferences.startupMode = startupMode;
    await savePreferences();
    return getPreferences();
}

// List valid destination folders within a workspace.
async function listFoldersForWorkspace(workspaceId) {
    const workspace = await getWorkspace(workspaceId);
    if (!workspace) throw new Error('Workspace not found.');
    return all(`SELECT * FROM folders WHERE workspace_id = ? ORDER BY name`, [
        workspaceId,
    ]);
}

// Move an active-workspace note and its note-scoped chats, then reindex it.
async function moveNoteToWorkspace(noteId, workspaceId, folderId) {
    await db.ready;
    const targetWorkspace = await getWorkspace(workspaceId);
    if (!targetWorkspace) throw new Error('Destination workspace not found.');
    const targetFolder = await get(
        `SELECT id FROM folders WHERE id = ? AND workspace_id = ?`,
        [folderId, workspaceId],
    );
    if (!targetFolder) throw new Error('Destination folder not found.');

    const note = await get(
        `SELECT id FROM notes WHERE id = ? AND workspace_id = ?`,
        [noteId, getActiveWorkspaceId()],
    );
    if (!note) throw new Error('Note not found in the active workspace.');

    await run('BEGIN TRANSACTION');
    try {
        await run(
            `UPDATE notes SET workspace_id = ?, folder_id = ? WHERE id = ?`,
            [workspaceId, folderId, noteId],
        );
        await run(
            `UPDATE chat_conversations SET workspace_id = ? WHERE scope = 'note' AND note_id = ?`,
            [workspaceId, noteId],
        );
        await run(`DELETE FROM vector_sync WHERE note_id = ?`, [noteId]);
        await run('COMMIT');
    } catch (error) {
        await run('ROLLBACK').catch(() => {});
        throw error;
    }
    vectorIndexer.requestIndex(noteId);
}

// Move an active-workspace folder, its notes, and related chats, then reindex notes.
async function moveFolderToWorkspace(folderId, workspaceId) {
    await db.ready;
    const targetWorkspace = await getWorkspace(workspaceId);
    if (!targetWorkspace) throw new Error('Destination workspace not found.');

    const folder = await get(
        `SELECT id FROM folders WHERE id = ? AND workspace_id = ?`,
        [folderId, getActiveWorkspaceId()],
    );
    if (!folder) throw new Error('Folder not found in the active workspace.');
    const notes = await all(`SELECT id FROM notes WHERE folder_id = ?`, [
        folderId,
    ]);

    await run('BEGIN TRANSACTION');
    try {
        await run(`UPDATE folders SET workspace_id = ? WHERE id = ?`, [
            workspaceId,
            folderId,
        ]);
        await run(`UPDATE notes SET workspace_id = ? WHERE folder_id = ?`, [
            workspaceId,
            folderId,
        ]);
        await run(
            `UPDATE chat_conversations SET workspace_id = ? WHERE scope = 'note' AND note_id IN (SELECT id FROM notes WHERE folder_id = ?)`,
            [workspaceId, folderId],
        );
        await run(
            `DELETE FROM vector_sync WHERE note_id IN (SELECT id FROM notes WHERE folder_id = ?)`,
            [folderId],
        );
        await run('COMMIT');
    } catch (error) {
        await run('ROLLBACK').catch(() => {});
        throw error;
    }
    notes.forEach(({ id }) => vectorIndexer.requestIndex(id));
}

module.exports = {
    createWorkspace,
    deleteWorkspace,
    getActiveWorkspaceId,
    getPreferences,
    initialize,
    listFoldersForWorkspace,
    listWorkspaces,
    moveFolderToWorkspace,
    moveNoteToWorkspace,
    renameWorkspace,
    setPreferences,
    switchWorkspace,
};
