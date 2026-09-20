// Coordinates Lumos's local-first device handoff sync through a user-selected shared folder:
// persists sync configuration, publishes versioned backup snapshots, compares snapshot ancestry
// at startup, and reports sync status to the UI. It detects divergence but does not replace the
// active database itself; main.js performs approved restores.

const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const backupService = require('./backupService');
const { getSyncStatePath } = require('../storagePaths');
const { isDescendant, newestSnapshot } = require('./syncSnapshotGraph');

const SYNC_STATE_VERSION = 1; // Version of the locally persisted sync state schema.
const VAULT_FORMAT_VERSION = 1; // Version of the shared sync-vault metadata format.
const VAULT_FILE = 'vault.json'; // Filename containing shared vault metadata.
const SNAPSHOTS_DIRECTORY = 'snapshots'; // Directory containing published sync snapshots.
const SYNC_DELAY_MS = 45 * 1000; // Delay after a local change before publishing a snapshot.

let state = null;
let activeSync = null;
let syncTimer = null;
const listeners = new Set();

// Builds the default disabled sync state used when no saved state exists.
function defaultState() {
    return {
        version: SYNC_STATE_VERSION,
        deviceId: crypto.randomUUID(),
        enabled: false,
        vaultPath: '',
        vaultId: null,
        lastAppliedSnapshotId: null,
        lastPublishedSnapshotId: null,
        dirty: false,
        status: 'disabled',
        lastSyncedAt: null,
        lastError: null,
    };
}

// Loads persisted sync state once, merging it with defaults and falling back safely on errors.
async function loadState() {
    if (state) return state;
    try {
        const saved = JSON.parse(
            await fsp.readFile(getSyncStatePath(), 'utf8'),
        );
        state = { ...defaultState(), ...saved };
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Could not load sync state:', error.message);
        }
        state = defaultState();
    }
    return state;
}

// Atomically persists the current sync state to disk.
async function saveState() {
    const statePath = getSyncStatePath();
    const temporaryPath = `${statePath}.${crypto.randomUUID()}.tmp`;
    await fsp.writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`);
    await fsp.rename(temporaryPath, statePath);
}

// Returns the sync state fields needed by the renderer.
function getStatus() {
    const current = state || defaultState();
    return {
        enabled: current.enabled,
        vaultPath: current.vaultPath,
        vaultId: current.vaultId,
        status: current.status,
        dirty: current.dirty,
        lastSyncedAt: current.lastSyncedAt,
        lastError: current.lastError,
    };
}

// Notifies status subscribers without allowing a listener failure to interrupt sync.
function notifyStatus() {
    const status = getStatus();
    for (const listener of listeners) {
        try {
            listener(status);
        } catch {
            // Status updates must not disrupt sync.
        }
    }
}

// Applies state changes, persists them, and notifies status subscribers.
async function updateState(updates) {
    await loadState();
    Object.assign(state, updates);
    await saveState();
    notifyStatus();
}

// Returns the vault metadata file path.
function getVaultFile(vaultPath) {
    return path.join(vaultPath, VAULT_FILE);
}

// Returns the directory containing the vault's snapshots.
function getSnapshotsPath(vaultPath) {
    return path.join(vaultPath, SNAPSHOTS_DIRECTORY);
}

// Reads and parses vault metadata from disk.
async function readVault(vaultPath) {
    return JSON.parse(await fsp.readFile(getVaultFile(vaultPath), 'utf8'));
}

// Creates a new vault and its snapshots directory with a unique vault ID.
async function createVault(vaultPath) {
    const vault = {
        formatVersion: VAULT_FORMAT_VERSION,
        vaultId: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
    };
    await fsp.mkdir(getSnapshotsPath(vaultPath), { recursive: true });
    const vaultPathname = getVaultFile(vaultPath);
    const temporaryPath = `${vaultPathname}.${crypto.randomUUID()}.tmp`;
    await fsp.writeFile(temporaryPath, `${JSON.stringify(vault, null, 2)}\n`);
    await fsp.rename(temporaryPath, vaultPathname);
    return vault;
}

// Ensures a compatible vault and snapshots directory exist at the configured path.
async function ensureVault(vaultPath) {
    await fsp.mkdir(vaultPath, { recursive: true });
    let vault;
    try {
        vault = await readVault(vaultPath);
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        vault = await createVault(vaultPath);
    }

    if (vault.formatVersion !== VAULT_FORMAT_VERSION || !vault.vaultId) {
        throw new Error('This folder is not a compatible Lumos sync vault.');
    }
    await fsp.mkdir(getSnapshotsPath(vaultPath), { recursive: true });
    return vault;
}

// Scans the vault for complete, valid sync snapshots and ignores incomplete uploads.
async function listSnapshots(vaultPath) {
    const snapshotsPath = getSnapshotsPath(vaultPath);
    let entries;
    try {
        entries = await fsp.readdir(snapshotsPath, { withFileTypes: true });
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
    }

    const snapshots = [];
    for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
        const snapshotPath = path.join(snapshotsPath, entry.name);
        try {
            const { manifest } =
                await backupService.validateBackup(snapshotPath);
            if (!manifest.sync?.snapshotId || !manifest.sync?.vaultId) continue;
            snapshots.push({
                id: manifest.sync.snapshotId,
                parentId: manifest.sync.parentSnapshotId || null,
                createdAt: manifest.createdAt,
                path: snapshotPath,
                manifest,
            });
        } catch (error) {
            // Cloud clients may expose a snapshot before all files arrive. It is
            // ignored until the next scan can validate it completely.
            console.warn(
                `Ignoring incomplete sync snapshot ${entry.name}:`,
                error.message,
            );
        }
    }
    return snapshots;
}

// Compares local and remote snapshot history at startup and decides whether to restore or report divergence.
async function prepareStartup() {
    await loadState();
    if (!state.enabled) return { action: 'none' };

    try {
        const vault = await ensureVault(state.vaultPath);
        if (state.vaultId && vault.vaultId !== state.vaultId) {
            throw new Error(
                'The selected sync folder belongs to a different Lumos vault.',
            );
        }

        const snapshots = (await listSnapshots(state.vaultPath)).filter(
            (snapshot) => snapshot.manifest.sync.vaultId === vault.vaultId,
        );
        const remote = newestSnapshot(snapshots);
        if (!remote) return { action: 'none' };

        const localId =
            state.lastPublishedSnapshotId || state.lastAppliedSnapshotId;
        if (!localId) {
            if (state.dirty) {
                await updateState({
                    status: 'diverged',
                    lastError:
                        'Local changes and an existing sync vault cannot be combined automatically.',
                });
                return { action: 'diverged', snapshot: remote };
            }
            return { action: 'restore', snapshot: remote };
        }
        if (remote.id === localId) return { action: 'none' };

        const snapshotsById = new Map(
            snapshots.map((snapshot) => [snapshot.id, snapshot]),
        );
        if (isDescendant(remote, localId, snapshotsById)) {
            if (state.dirty) {
                await updateState({
                    status: 'diverged',
                    lastError:
                        'Another device changed this vault before local changes were saved.',
                });
                return { action: 'diverged', snapshot: remote };
            }
            return { action: 'restore', snapshot: remote };
        }
        await updateState({
            status: 'diverged',
            lastError:
                'This device and the sync vault have independent snapshots that cannot be merged automatically.',
        });
        return { action: 'diverged', snapshot: remote };
    } catch (error) {
        await updateState({ status: 'error', lastError: error.message });
        return { action: 'error', error };
    }
}

// Records a successfully applied snapshot and clears the pending local-change state.
async function markApplied(snapshotId) {
    await updateState({
        lastAppliedSnapshotId: snapshotId,
        lastPublishedSnapshotId: snapshotId,
        dirty: false,
        status: 'synced',
        lastSyncedAt: new Date().toISOString(),
        lastError: null,
    });
}

// Creates a validated local backup, publishes it as a sync snapshot, and serializes concurrent publishes.
async function publishSnapshot() {
    await loadState();
    if (!state.enabled) return null;
    if (!state.dirty && state.lastPublishedSnapshotId) return null;
    if (activeSync) return activeSync;

    activeSync = (async () => {
        try {
            await updateState({ status: 'syncing', lastError: null });
            const vault = await ensureVault(state.vaultPath);
            if (vault.vaultId !== state.vaultId) {
                throw new Error(
                    'The selected sync folder belongs to a different Lumos vault.',
                );
            }

            const snapshots = (await listSnapshots(state.vaultPath)).filter(
                (snapshot) => snapshot.manifest.sync.vaultId === vault.vaultId,
            );
            const remote = newestSnapshot(snapshots);
            const localId =
                state.lastPublishedSnapshotId || state.lastAppliedSnapshotId;
            if (remote && remote.id !== localId) {
                throw new Error(
                    'Another device has newer changes. Restart Lumos to apply them before saving new snapshots.',
                );
            }

            const localBackup = await backupService.createBackup('sync');
            const snapshotId = crypto.randomUUID();
            const stagingPath = path.join(
                getSnapshotsPath(state.vaultPath),
                `.${snapshotId}.partial`,
            );
            const destinationPath = path.join(
                getSnapshotsPath(state.vaultPath),
                snapshotId,
            );
            try {
                await fsp.cp(localBackup.path, stagingPath, {
                    recursive: true,
                });
                const manifestPath = path.join(stagingPath, 'manifest.json');
                const manifest = JSON.parse(
                    await fsp.readFile(manifestPath, 'utf8'),
                );
                manifest.sync = {
                    vaultId: vault.vaultId,
                    snapshotId,
                    parentSnapshotId: localId,
                    deviceId: state.deviceId,
                };
                await fsp.writeFile(
                    manifestPath,
                    `${JSON.stringify(manifest, null, 2)}\n`,
                );
                await fsp.rename(stagingPath, destinationPath);
                await updateState({
                    lastAppliedSnapshotId: snapshotId,
                    lastPublishedSnapshotId: snapshotId,
                    dirty: false,
                    status: 'synced',
                    lastSyncedAt: new Date().toISOString(),
                    lastError: null,
                });
            } catch (error) {
                await fsp.rm(stagingPath, { recursive: true, force: true });
                throw error;
            } finally {
                await backupService
                    .deleteBackup(localBackup.id)
                    .catch(() => {});
            }
            return { snapshotId, path: destinationPath };
        } catch (error) {
            await updateState({ status: 'error', lastError: error.message });
            throw error;
        } finally {
            activeSync = null;
        }
    })();

    return activeSync;
}

// Marks local data as dirty and schedules a delayed snapshot publication.
async function requestSync() {
    await loadState();
    if (!state.enabled) return;
    await updateState({ dirty: true, status: 'pending', lastError: null });
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
        publishSnapshot().catch((error) => {
            console.error('Sync snapshot failed:', error.message);
        });
    }, SYNC_DELAY_MS);
}

// Cancels any delayed publication and publishes local changes immediately.
async function syncNow() {
    clearTimeout(syncTimer);
    await loadState();
    if (!state.enabled) throw new Error('Sync is not enabled.');
    return publishSnapshot();
}

// Enables sync for a vault, creating its first snapshot or requesting a restart for existing remote data.
async function configure(vaultPath) {
    if (typeof vaultPath !== 'string' || !path.isAbsolute(vaultPath)) {
        throw new Error('Choose a valid sync folder.');
    }
    const vault = await ensureVault(vaultPath);
    const existingSnapshots = await listSnapshots(vaultPath);
    await loadState();
    await updateState({
        enabled: true,
        vaultPath,
        vaultId: vault.vaultId,
        lastAppliedSnapshotId: null,
        lastPublishedSnapshotId: null,
        dirty: existingSnapshots.length === 0,
        status: existingSnapshots.length === 0 ? 'pending' : 'remote-update',
        lastError: null,
    });
    if (existingSnapshots.length === 0) await syncNow();
    return { ...getStatus(), requiresRestart: existingSnapshots.length > 0 };
}

// Disables sync, cancels pending publication, and clears the configured vault.
async function disable() {
    clearTimeout(syncTimer);
    await updateState({
        enabled: false,
        vaultPath: '',
        vaultId: null,
        dirty: false,
        status: 'disabled',
        lastError: null,
    });
}

// Registers a sync-status listener and returns an unsubscribe function.
function onStatus(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

// Returns the configured vault path, if sync is enabled.
function revealVault() {
    return state?.vaultPath || null;
}

module.exports = {
    configure,
    disable,
    // Loads persisted state before returning the renderer-facing status.
    getStatus: async () => {
        await loadState();
        return getStatus();
    },
    markApplied,
    onStatus,
    prepareStartup,
    requestSync,
    revealVault,
    syncNow,
};
