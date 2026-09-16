const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

async function fixture(t) {
    const root = await fs.mkdtemp(
        path.join(os.tmpdir(), 'lumos-sync-recovery-'),
    );
    t.after(() => fs.rm(root, { recursive: true, force: true }));
    const backups = path.join(root, 'backups');
    const data = path.join(root, 'data');
    const marker = path.join(root, 'restore-state.json');
    await fs.mkdir(data);
    await fs.mkdir(backups);
    const controls = { corrupt: false, failBackup: false };
    const db = {
        all(sql, params, callback) {
            callback(
                null,
                sql === 'PRAGMA quick_check'
                    ? [{ quick_check: controls.corrupt ? 'corrupt' : 'ok' }]
                    : [],
            );
        },
        exec(sql, callback) {
            if (controls.failBackup)
                return callback(new Error('Backup failed'));
            const destination = sql
                .match(/^VACUUM INTO '(.*)'$/)[1]
                .replace(/''/g, "'");
            fs.writeFile(destination, 'snapshot fixture').then(
                () => callback(),
                callback,
            );
        },
        close(callback) {
            callback();
        },
    };
    const filename = path.resolve(
        __dirname,
        '../src/main/services/backupService.js',
    );
    const realRequire = createRequire(filename);
    const module = { exports: {} };
    vm.runInNewContext(
        await fs.readFile(filename, 'utf8'),
        {
            module,
            console,
            require(id) {
                if (id === 'electron')
                    return { app: { getVersion: () => 'test' } };
                if (id === 'sqlite3')
                    return {
                        verbose: () => ({
                            Database: function () {
                                return db;
                            },
                        }),
                    };
                if (id === '../database/db') return db;
                if (id === '../storagePaths')
                    return {
                        getBackupPath: () => backups,
                        getDataPath: () => data,
                        getRestoreStatePath: () => marker,
                        getStorageRoot: () => root,
                    };
                return realRequire(id);
            },
        },
        { filename },
    );
    async function seedBackup(id, trigger, day) {
        const directory = path.join(backups, id);
        await fs.mkdir(directory);
        await fs.writeFile(path.join(directory, 'lumos.sqlite'), 'fixture');
        await fs.writeFile(
            path.join(directory, 'manifest.json'),
            JSON.stringify({
                formatVersion: 1,
                trigger,
                createdAt: `2020-01-${day}T00:00:00.000Z`,
            }),
        );
    }
    return {
        root,
        data,
        marker,
        backups,
        controls,
        seedBackup,
        service: module.exports,
    };
}

test('keeps the latest three pre-device-restore backups without pruning other triggers', async (t) => {
    const f = await fixture(t);
    for (let i = 1; i <= 4; i++)
        await f.seedBackup(`sync-${i}`, 'pre-device-restore', `0${i}`);
    for (const trigger of ['manual', 'automatic', 'pre-manual-restore'])
        await f.seedBackup(trigger, trigger, '01');
    await f.service.createBackup('pre-device-restore');
    const backups = await f.service.listBackups();
    assert.equal(
        backups.filter((b) => b.trigger === 'pre-device-restore').length,
        3,
    );
    const ids = backups.map((b) => b.id);
    for (const id of [
        'sync-3',
        'sync-4',
        'manual',
        'automatic',
        'pre-manual-restore',
    ])
        assert.ok(ids.includes(id));
    assert.ok(!ids.includes('sync-1') && !ids.includes('sync-2'));
});

test('a failed backup does not prune existing recovery points', async (t) => {
    const f = await fixture(t);
    for (let i = 1; i <= 4; i++)
        await f.seedBackup(`sync-${i}`, 'pre-device-restore', `0${i}`);
    f.controls.failBackup = true;
    await assert.rejects(
        f.service.createBackup('pre-device-restore'),
        /Backup failed/,
    );
    assert.equal((await f.service.listBackups()).length, 4);
});

test('removes the recorded previous data only after database validation, retaining the RAG marker', async (t) => {
    const f = await fixture(t);
    const previous = `${f.data}.before-sync-restore-123`;
    await fs.mkdir(previous);
    await fs.writeFile(path.join(previous, 'lumos.sqlite'), 'recovery data');
    await f.service.markRestorePending(previous);
    f.controls.corrupt = true;
    await assert.rejects(
        f.service.completePendingSyncRestore(),
        /integrity check failed/,
    );
    await fs.access(previous);
    await fs.access(f.marker);
    f.controls.corrupt = false;
    await f.service.completePendingSyncRestore();
    await assert.rejects(fs.access(previous), { code: 'ENOENT' });
    await fs.access(f.data);
    await fs.access(f.marker);
    await f.service.completePendingSyncRestore();
    assert.ok(await f.service.consumeRestoreState());
    assert.equal(await f.service.consumeRestoreState(), null);
});

test('cleanup rejects a marker pointing at the active data directory', async (t) => {
    const f = await fixture(t);
    await f.service.markRestorePending(f.data);
    await assert.rejects(
        f.service.completePendingSyncRestore(),
        /Invalid sync restore cleanup path/,
    );
    await fs.access(f.data);
});
