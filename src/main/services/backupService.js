const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { app } = require('electron');
const db = require('../database/db');
const {
    getBackupPath,
    getDataPath,
    getRestoreStatePath,
    getStorageRoot,
} = require('../storagePaths');

const BACKUP_FORMAT_VERSION = 1;    // Manifest schema version; prevents opening backups made with incompatible formats
const AUTOMATIC_BACKUP_INTERVAL = 24 * 60 * 60 * 1000;  // Minimum time between automatic backups, in milliseconds: 24 hours
const AUTOMATIC_BACKUP_LIMIT = 30;  // Maximum automatic backups retained; older automatic backups are deleted

let activeBackup = null;    // Holds the in-progress backup Promise, or null when idle; prevents backups from running concurrently
let activeBackupTrigger = null; // Stores that in-progress backup’s trigger (manual or automatic), letting a duplicate automatic request reuse it while other requests wait then create their own backup

// Promisified SQLite3 operations
function query(database, sql, params = []) {
    return new Promise((resolve, reject) => {
        database.all(sql, params, (error, rows) =>
            error ? reject(error) : resolve(rows),
        );
    });
}

// Promisified SQLite3 close operation
function close(database) {
    return new Promise((resolve, reject) =>
        database.close((error) => (error ? reject(error) : resolve())),
    );
}

// Computes the SHA-256 hash of a file, returning a hex string
function getFileHash(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('error', reject);
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}

// Checks whether a string points to an app-managed note-images/ asset
function isManagedImagePath(value) {
    return typeof value === 'string' && value.startsWith('note-images/');
}

// Recursively traverses note JSON and collects referenced managed image paths
function collectImagePaths(node, paths = new Set()) {
    if (!node || typeof node !== 'object') return paths;
    if (Array.isArray(node)) {
        node.forEach((entry) => collectImagePaths(entry, paths));
        return paths;
    }

    if (node.type === 'noteImage' && node.attrs) {
        const source = node.attrs.storageSrc || node.attrs.src;
        if (isManagedImagePath(source)) paths.add(source.replace(/\\/g, '/'));
    }

    if (Array.isArray(node.content)) {
        node.content.forEach((entry) => collectImagePaths(entry, paths));
    }
    return paths;
}

// Resolves a managed image path under a root directory and rejects path traversal/out-of-root paths
function resolveImagePath(rootPath, relativePath) {
    const sourcePath = path.resolve(rootPath, relativePath);
    const imageRoot = path.resolve(rootPath, 'note-images');
    const relative = path.relative(imageRoot, sourcePath);

    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error('Backup contains an invalid managed image path.');
    }
    return sourcePath;
}

// Integrity-checks a copied SQLite DB, extracts referenced note images, verifies those files exist, and returns note/image metadata
async function getSnapshotMetadata(databasePath, imageRootPath) {
    // FTS5 validates its inverted index by writing temporary state, so this
    // must be a writable copy even though validation does not change content.
    const snapshot = new sqlite3.Database(databasePath);
    try {
        const checks = await query(snapshot, 'PRAGMA quick_check');
        if (checks.some((row) => row.quick_check !== 'ok')) {
            throw new Error('SQLite integrity check failed.');
        }

        const notes = await query(snapshot, 'SELECT content_json FROM notes');
        const imagePaths = new Set();
        for (const note of notes) {
            try {
                collectImagePaths(JSON.parse(note.content_json), imagePaths);
            } catch {
                throw new Error('Backup contains invalid note content.');
            }
        }

        for (const imagePath of imagePaths) {
            const sourcePath = resolveImagePath(imageRootPath, imagePath);
            await fsp.access(sourcePath);
        }

        return { noteCount: notes.length, imagePaths: [...imagePaths] };
    } finally {
        await close(snapshot);
    }
}

// Builds the timestamped default backup name, using auto for automatic backups
function backupName(trigger, createdAt) {
    const date = new Date(createdAt);
    const pad = (value) => String(value).padStart(2, '0');
    const day = [
        date.getFullYear(),
        pad(date.getMonth() + 1),
        pad(date.getDate()),
    ];
    const time = [date.getHours(), date.getMinutes(), date.getSeconds()].map(
        pad,
    );
    const type = trigger === 'automatic' ? 'auto' : trigger;
    return `${day.join('_')}_${time.join(':')}_${type}_backup`;
}

// Reads a backup’s manifest and rejects unsupported format versions
async function readManifest(backupPath) {
    const manifestPath = path.join(backupPath, 'manifest.json');
    const manifest = JSON.parse(await fsp.readFile(manifestPath, 'utf8'));
    if (manifest.formatVersion !== BACKUP_FORMAT_VERSION) {
        throw new Error(
            'This backup was created by an unsupported Lumos version.',
        );
    }
    return manifest;
}

// Converts manifest/database information into the summary object used by the UI/API
async function getBackupSummary(backupPath) {
    const manifest = await readManifest(backupPath);
    const databasePath = path.join(backupPath, 'lumos.sqlite');
    const databaseStat = await fsp.stat(databasePath);
    return {
        id: path.basename(backupPath),
        path: backupPath,
        name: manifest.name || backupName(manifest.trigger, manifest.createdAt),
        createdAt: manifest.createdAt,
        trigger: manifest.trigger,
        noteCount: manifest.noteCount,
        imageCount: manifest.imageCount,
        size: manifest.size || databaseStat.size,
    };
}

// Ensures the backup directory exists, loads valid backup directories, ignores invalid ones, and returns newest-first.
async function listBackups() {
    await fsp.mkdir(getBackupPath(), { recursive: true });
    const entries = await fsp.readdir(getBackupPath(), { withFileTypes: true });
    const backups = await Promise.all(
        entries
            .filter(
                (entry) => entry.isDirectory() && !entry.name.startsWith('.'),
            )
            .map((entry) =>
                getBackupSummary(path.join(getBackupPath(), entry.name)).catch(
                    () => null,
                ),
            ),
    );
    return backups
        .filter(Boolean)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// Copies every referenced managed image into the backup and returns their combined byte size
async function copyReferencedImages(imagePaths, sourceRoot, destinationRoot) {
    let totalSize = 0;
    for (const imagePath of imagePaths) {
        const sourcePath = resolveImagePath(sourceRoot, imagePath);
        const destinationPath = resolveImagePath(destinationRoot, imagePath);
        await fsp.mkdir(path.dirname(destinationPath), { recursive: true });
        await fsp.copyFile(sourcePath, destinationPath);
        totalSize += (await fsp.stat(sourcePath)).size;
    }
    return totalSize;
}

// Uses SQLite VACUUM INTO to create a compact, consistent copy of the active database
async function vacuumInto(destinationPath) {
    const escapedPath = destinationPath.replace(/'/g, "''");
    await new Promise((resolve, reject) =>
        db.exec(`VACUUM INTO '${escapedPath}'`, (error) =>
            error ? reject(error) : resolve(),
        ),
    );
}

// Deletes automatic backups beyond the configured retention limit
async function pruneAutomaticBackups() {
    const automaticBackups = (await listBackups()).filter(
        (backup) => backup.trigger === 'automatic',
    );
    await Promise.all(
        automaticBackups
            .slice(AUTOMATIC_BACKUP_LIMIT)
            .map((backup) =>
                fsp.rm(backup.path, { recursive: true, force: true }),
            ),
    );
}

//Creates a staged database-and-images backup, writes its manifest/checksum, atomically publishes it, cleans up failures, and serializes concurrent backup creation
async function createBackup(trigger = 'manual', customName = '') {
    if (typeof customName !== 'string' || customName.trim().length > 120) {
        throw new Error('Backup name must be 120 characters or fewer.');
    }
    if (activeBackup) {
        const isSameTrigger =
            activeBackupTrigger === trigger && trigger !== 'manual';
        const activeResult = await activeBackup;
        return isSameTrigger ? activeResult : createBackup(trigger, customName);
    }

    activeBackupTrigger = trigger;
    activeBackup = (async () => {
        await fsp.mkdir(getBackupPath(), { recursive: true });
        const createdAt = new Date().toISOString();
        const defaultName = backupName(trigger, createdAt);
        const name =
            trigger === 'manual'
                ? customName.trim() || defaultName
                : defaultName;
        const directoryName = `${defaultName.replace(/:/g, '-')}-${crypto.randomUUID()}`;
        const stagingPath = path.join(getBackupPath(), `.${directoryName}`);
        const finalPath = path.join(getBackupPath(), directoryName);

        try {
            await fsp.mkdir(stagingPath, { recursive: true });
            const databasePath = path.join(stagingPath, 'lumos.sqlite');
            await vacuumInto(databasePath);
            const metadata = await getSnapshotMetadata(
                databasePath,
                getDataPath(),
            );
            const imageSize = await copyReferencedImages(
                metadata.imagePaths,
                getDataPath(),
                stagingPath,
            );

            const databaseStat = await fsp.stat(databasePath);
            const manifest = {
                formatVersion: BACKUP_FORMAT_VERSION,
                appVersion: app.getVersion(),
                createdAt,
                name,
                trigger,
                noteCount: metadata.noteCount,
                imageCount: metadata.imagePaths.length,
                databaseHash: await getFileHash(databasePath),
                size: databaseStat.size + imageSize,
            };
            await fsp.writeFile(
                path.join(stagingPath, 'manifest.json'),
                `${JSON.stringify(manifest, null, 2)}\n`,
            );
            await fsp.rename(stagingPath, finalPath);
            if (trigger === 'automatic') await pruneAutomaticBackups();
            return getBackupSummary(finalPath);
        } catch (error) {
            await fsp.rm(stagingPath, { recursive: true, force: true });
            throw error;
        }
    })();

    try {
        return await activeBackup;
    } finally {
        activeBackup = null;
        activeBackupTrigger = null;
    }
}

// Creates an automatic backup only if none exists from the past 24 hours
async function createAutomaticBackupIfDue() {
    const latest = (await listBackups()).find(
        (backup) => backup.trigger === 'automatic',
    );
    if (
        latest &&
        Date.now() - new Date(latest.createdAt).getTime() <
            AUTOMATIC_BACKUP_INTERVAL
    ) {
        return null;
    }
    return createBackup('automatic');
}

// Validates a backup ID, confirms it has a readable manifest, and returns its local directory path
async function getLocalBackupPath(id) {
    if (!id || path.basename(id) !== id) throw new Error('Invalid backup.');
    const backupPath = path.join(getBackupPath(), id);
    await readManifest(backupPath);
    return backupPath;
}

// Validates and recursively deletes a local backup
async function deleteBackup(id) {
    const backupPath = await getLocalBackupPath(id);
    await fsp.rm(backupPath, { recursive: true, force: true });
}

// Validates a backup ID, reads its manifest, updates the name, and atomically writes the updated manifest
async function renameBackup(id, name) {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) {
        throw new Error('Backup name must be between 1 and 120 characters.');
    }
    const backupPath = await getLocalBackupPath(id);
    const manifestPath = path.join(backupPath, 'manifest.json');
    const manifest = await readManifest(backupPath);
    manifest.name = name.trim();
    const temporaryManifestPath = `${manifestPath}.${crypto.randomUUID()}.tmp`;
    await fsp.writeFile(
        temporaryManifestPath,
        `${JSON.stringify(manifest, null, 2)}\n`,
    );
    await fsp.rename(temporaryManifestPath, manifestPath);
    return getBackupSummary(backupPath);
}

// Validates and copies a local backup to another directory, refusing to overwrite an existing destination
async function exportBackup(id, destinationDirectory) {
    const backupPath = await getLocalBackupPath(id);
    const destinationPath = path.join(
        destinationDirectory,
        path.basename(backupPath),
    );
    if (fs.existsSync(destinationPath)) {
        throw new Error(
            'A backup with this name already exists in that folder.',
        );
    }
    await fsp.cp(backupPath, destinationPath, {
        recursive: true,
        errorOnExist: true,
    });
    return destinationPath;
}

// Validates an internal or external backup by checking its manifest, DB integrity, referenced images, and database checksum
async function validateBackup(backupPath) {
    const manifest = await readManifest(backupPath);
    const databasePath = path.join(backupPath, 'lumos.sqlite');
    const validationPath = path.join(
        getStorageRoot(),
        `.backup-validation-${crypto.randomUUID()}.sqlite`,
    );

    try {
        // External backups can be read-only, so validate a local temporary copy.
        await fsp.copyFile(databasePath, validationPath);
        const metadata = await getSnapshotMetadata(validationPath, backupPath);
        if ((await getFileHash(databasePath)) !== manifest.databaseHash) {
            throw new Error('The backup database checksum does not match.');
        }
        return { manifest, metadata };
    } finally {
        await fsp.rm(validationPath, { force: true });
    }
}

// Validates a backup, then creates a temporary local restore directory containing its database and images
async function stageRestore(backupPath) {
    await validateBackup(backupPath);
    const stagingPath = path.join(
        getStorageRoot(),
        `.restore-${crypto.randomUUID()}`,
    );
    await fsp.mkdir(stagingPath, { recursive: true });
    try {
        await fsp.copyFile(
            path.join(backupPath, 'lumos.sqlite'),
            path.join(stagingPath, 'lumos.sqlite'),
        );
        const imagesPath = path.join(backupPath, 'note-images');
        if (fs.existsSync(imagesPath)) {
            await fsp.cp(imagesPath, path.join(stagingPath, 'note-images'), {
                recursive: true,
            });
        }
        return stagingPath;
    } catch (error) {
        await fsp.rm(stagingPath, { recursive: true, force: true });
        throw error;
    }
}

// Writes a timestamped marker indicating that a restore should be completed on the next startup
async function markRestorePending() {
    await fsp.writeFile(
        getRestoreStatePath(),
        JSON.stringify({ createdAt: new Date().toISOString() }),
    );
}

// Reads and deletes the restore marker; returns null when no marker exists
async function consumeRestoreState() {
    try {
        const state = JSON.parse(
            await fsp.readFile(getRestoreStatePath(), 'utf8'),
        );
        await fsp.rm(getRestoreStatePath(), { force: true });
        return state;
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
    }
}

module.exports = {
    consumeRestoreState,
    createAutomaticBackupIfDue,
    createBackup,
    deleteBackup,
    exportBackup,
    getLocalBackupPath,
    listBackups,
    markRestorePending,
    renameBackup,
    stageRestore,
    validateBackup,
};
