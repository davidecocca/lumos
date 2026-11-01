const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { createRequire } = require('node:module');

async function loadModule(relativePath, overrides = {}) {
    const filename = path.resolve(__dirname, relativePath);
    const realRequire = createRequire(filename);
    const module = { exports: {} };
    vm.runInNewContext(
        await fs.readFile(filename, 'utf8'),
        {
            module,
            console,
            require: (id) => overrides[id] || realRequire(id),
        },
        { filename },
    );
    return module.exports;
}

async function fixture(t) {
    const directory = await fs.mkdtemp(
        path.join(os.tmpdir(), 'lumos-workspace-'),
    );
    const workspaceContext = await loadModule(
        '../src/main/workspaceContext.js',
    );
    const preferencesPath = path.join(directory, 'workspace-preferences.json');
    const storagePaths = {
        initializeStorage() {},
        getDatabasePath: () => path.join(directory, 'test.sqlite'),
        getWorkspacePreferencesPath: () => preferencesPath,
    };
    const db = await loadModule('../src/main/database/db.js', {
        '../storagePaths': storagePaths,
        '../workspaceContext': workspaceContext,
    });
    t.after(async () => {
        await new Promise((resolve, reject) =>
            db.close((error) => (error ? reject(error) : resolve())),
        );
        await fs.rm(directory, { recursive: true });
    });
    await db.ready;
    const service = await loadModule(
        '../src/main/services/workspaceService.js',
        {
            '../database/db': db,
            '../workspaceContext': workspaceContext,
            '../storagePaths': storagePaths,
            '../database/vectorStore': {},
            './vectorIndexer': {},
            './imageService': {},
        },
    );
    const all = (sql) =>
        new Promise((resolve, reject) =>
            db.all(sql, (error, rows) =>
                error ? reject(error) : resolve(rows),
            ),
        );
    return { db, service, workspaceContext, preferencesPath, all };
}

test('workspace context accepts zero and nonnegative integer IDs only', async () => {
    const context = await loadModule('../src/main/workspaceContext.js');
    assert.equal(context.DEFAULT_WORKSPACE_ID, 0);
    assert.equal(context.getActiveWorkspaceId(), 0);
    context.setActiveWorkspaceId(1);
    context.setActiveWorkspaceId(0);
    assert.equal(context.getActiveWorkspaceId(), 0);
    for (const value of ['default', '0', null, undefined, -1, 0.5, NaN])
        assert.throws(
            () => context.setActiveWorkspaceId(value),
            /Invalid workspace/,
        );
});

test('default workspace is zero and generated IDs start at one without reuse', async (t) => {
    const { service, all } = await fixture(t);
    await service.initialize();
    const initial = await service.listWorkspaces();
    assert.equal(initial.length, 1);
    assert.equal(initial[0].id, 0);
    const first = await service.createWorkspace('First');
    const second = await service.createWorkspace('Second');
    assert.equal(first.id, 1);
    assert.equal(second.id, 2);
    await service.deleteWorkspace(2);
    assert.equal((await service.createWorkspace('Third')).id, 3);
    await assert.rejects(service.deleteWorkspace(0), /default workspace/);
    for (const table of [
        'folders',
        'notes',
        'chat_conversations',
        'kanban_boards',
    ]) {
        const fields = await all(`PRAGMA table_info(${table})`);
        assert.equal(
            fields.find((field) => field.name === 'workspace_id').type,
            'INTEGER',
        );
    }
    assert.deepEqual(await all('PRAGMA foreign_key_check'), []);
});

test('switching and startup preferences preserve default workspace zero', async (t) => {
    const { service, preferencesPath } = await fixture(t);
    assert.equal((await service.initialize()).id, 0);
    const created = await service.createWorkspace('Work');
    await service.switchWorkspace(created.id);
    assert.equal((await service.switchWorkspace(0)).id, 0);
    assert.equal(service.getActiveWorkspaceId(), 0);
    await service.setPreferences({
        startupMode: 'specific',
        startupWorkspaceId: 0,
    });
    const preferences = JSON.parse(await fs.readFile(preferencesPath, 'utf8'));
    assert.equal(preferences.startupWorkspaceId, 0);
    assert.equal(preferences.lastUsedWorkspaceId, 0);
    assert.equal((await service.initialize()).id, 0);
});

test('renderer workspace getter and tab persistence retain zero', async (t) => {
    const { createPinia, setActivePinia, defineStore } = await import('pinia');
    const source = await fs.readFile(
        path.resolve(__dirname, '../src/rendered/stores/workspaceStore.js'),
        'utf8',
    );
    const module = { exports: {} };
    vm.runInNewContext(
        source
            .replace(/^import .*;\n/gm, '')
            .replace('export const useWorkspaceStore =', 'module.exports ='),
        { module, defineStore },
    );
    const useWorkspaceStore = module.exports;
    const { useTabsStore } =
        await import('../src/rendered/stores/tabsStore.js');
    setActivePinia(createPinia());
    const entries = new Map();
    const previous = global.localStorage;
    global.localStorage = {
        getItem: (key) => entries.get(key) ?? null,
        setItem: (key, value) => entries.set(key, value),
    };
    t.after(() => {
        if (previous === undefined) delete global.localStorage;
        else global.localStorage = previous;
    });
    const workspaces = useWorkspaceStore();
    assert.equal(workspaces.currentWorkspaceId, null);
    workspaces.currentWorkspace = { id: 0 };
    assert.equal(workspaces.currentWorkspaceId, 0);
    const tabs = useTabsStore();
    await tabs.restoreSession(0);
    tabs.saveSession();
    assert.ok(entries.has('lumosTabSession:0'));
    assert.ok(!entries.has('lumosTabSession:default'));
});
