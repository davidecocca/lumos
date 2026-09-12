import assert from 'node:assert/strict';
import test from 'node:test';
import { createPinia, disposePinia } from 'pinia';
import { useTabsStore } from '../src/rendered/stores/tabsStore.js';

const SESSION_KEY = 'lumosTabSession';
const PREFERENCE_KEY = 'lumosRestoreOpenTabs';

function setup(t, { session, preference, lookup = async () => [] } = {}) {
    const values = new Map();
    if (session !== undefined) values.set(SESSION_KEY, JSON.stringify(session));
    if (preference !== undefined) values.set(PREFERENCE_KEY, preference);
    const storage = {
        getItem: t.mock.fn((key) => values.get(key) ?? null),
        setItem: t.mock.fn((key, value) => values.set(key, String(value))),
    };
    const getNotesByIds = t.mock.fn(lookup);
    for (const [key, value] of Object.entries({
        localStorage: storage,
        window: { api: { getNotesByIds } },
    })) {
        const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
        Object.defineProperty(globalThis, key, { configurable: true, value });
        t.after(() => {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else delete globalThis[key];
        });
    }
    const warn = t.mock.method(console, 'warn', () => {});
    const pinia = createPinia();
    t.after(() => disposePinia(pinia));
    return {
        store: useTabsStore(pinia),
        values,
        storage,
        getNotesByIds,
        warn,
    };
}

test('restoration defaults to enabled with an empty session', async (t) => {
    const { store, getNotesByIds, storage } = setup(t);
    assert.equal(store.restoreOpenTabsOnStartup, true);
    await store.restoreSession();
    assert.equal(store.restoreOpenTabsOnStartup, true);
    assert.deepEqual(store.tabs, []);
    assert.equal(store.activeNoteId, null);
    assert.equal(getNotesByIds.mock.callCount(), 0);
    assert.equal(storage.setItem.mock.callCount(), 0);
});

test('restores saved order and active ID using current, out-of-order metadata', async (t) => {
    const { store, getNotesByIds, storage } = setup(t, {
        session: { noteIds: [3, 1, 2], activeNoteId: 1 },
        lookup: async () => [
            { id: 2, title: 'Renamed second', content: 'Not tab data' },
            { id: 3, title: 'Current third' },
            { id: 1, title: 'Current first' },
            { id: 4, title: 'Unrequested' },
        ],
    });
    await store.restoreSession();
    assert.deepEqual(getNotesByIds.mock.calls[0].arguments, [[3, 1, 2]]);
    assert.deepEqual(store.tabs, [
        { id: 3, title: 'Current third' },
        { id: 1, title: 'Current first' },
        { id: 2, title: 'Renamed second' },
    ]);
    assert.equal(store.activeNoteId, 1);
    assert.equal(storage.setItem.mock.callCount(), 0);
});

for (const { name, active, survivors, expectedActive } of [
    {
        name: 'saved null remains null',
        active: null,
        survivors: [3, 1, 2],
        expectedActive: null,
    },
    {
        name: 'deleted active falls back to first survivor',
        active: 1,
        survivors: [2, 3],
        expectedActive: 3,
    },
    {
        name: 'deleted background preserves active',
        active: 1,
        survivors: [2, 1],
        expectedActive: 1,
    },
    {
        name: 'all deleted leaves an empty session',
        active: 1,
        survivors: [],
        expectedActive: null,
    },
]) {
    test(name, async (t) => {
        const { store } = setup(t, {
            session: { noteIds: [3, 1, 2], activeNoteId: active },
            lookup: async () =>
                survivors.map((id) => ({ id, title: `Note ${id}` })),
        });
        await store.restoreSession();
        assert.deepEqual(
            store.tabs.map((tab) => tab.id),
            [3, 1, 2].filter((id) => survivors.includes(id)),
        );
        assert.equal(store.activeNoteId, expectedActive);
    });
}

for (const raw of [
    '{broken',
    'null',
    'false',
    '42',
    '"session"',
    '[]',
    '{}',
    '{"noteIds":{}}',
    '{"noteIds":"1,2"}',
]) {
    test(`ignores corrupt JSON or invalid session shape: ${raw}`, async (t) => {
        const { store, values, getNotesByIds, storage } = setup(t);
        values.set(SESSION_KEY, raw);
        await assert.doesNotReject(() => store.restoreSession());
        assert.deepEqual(store.tabs, []);
        assert.equal(store.activeNoteId, null);
        assert.equal(getNotesByIds.mock.callCount(), 0);
        assert.equal(storage.setItem.mock.callCount(), 0);
        assert.equal(values.get(SESSION_KEY), raw);
    });
}

test('filters IDs to positive safe integers and deduplicates in saved order', async (t) => {
    const ids = [2, Number.MAX_SAFE_INTEGER, 1];
    const { store, getNotesByIds } = setup(t, {
        session: {
            noteIds: [
                2,
                '2',
                0,
                -1,
                1.5,
                null,
                true,
                {},
                [],
                Number.MAX_SAFE_INTEGER,
                Number.MAX_SAFE_INTEGER + 1,
                2,
                1,
                1,
            ],
            activeNoteId: 1,
        },
        lookup: async () => ids.map((id) => ({ id, title: String(id) })),
    });
    await store.restoreSession();
    assert.deepEqual(getNotesByIds.mock.calls[0].arguments, [ids]);
    assert.deepEqual(
        store.tabs.map((tab) => tab.id),
        ids,
    );
    assert.equal(store.activeNoteId, 1);
});

test('no valid IDs skips metadata lookup', async (t) => {
    const { store, getNotesByIds } = setup(t, {
        session: { noteIds: [0, -1, '1', null, 0.5], activeNoteId: null },
    });
    await store.restoreSession();
    assert.equal(getNotesByIds.mock.callCount(), 0);
    assert.deepEqual(store.tabs, []);
    assert.equal(store.activeNoteId, null);
});

test('disabled restoration skips metadata and starts empty without overwriting the snapshot', async (t) => {
    const { store, getNotesByIds, storage } = setup(t, {
        preference: 'false',
        session: { noteIds: [1], activeNoteId: 1 },
    });
    await store.restoreSession();
    assert.equal(store.restoreOpenTabsOnStartup, false);
    assert.deepEqual(store.tabs, []);
    assert.equal(store.activeNoteId, null);
    assert.equal(getNotesByIds.mock.callCount(), 0);
    assert.equal(storage.setItem.mock.callCount(), 0);
});

test('failed metadata fetch is nonfatal and does not automatically overwrite the snapshot', async (t) => {
    const { store, values, storage, warn } = setup(t, {
        session: { noteIds: [1], activeNoteId: 1 },
        lookup: async () => {
            throw new Error('Metadata unavailable');
        },
    });
    const saved = values.get(SESSION_KEY);
    await assert.doesNotReject(() => store.restoreSession());
    assert.deepEqual(store.tabs, []);
    assert.equal(store.activeNoteId, null);
    assert.equal(storage.setItem.mock.callCount(), 0);
    assert.equal(values.get(SESSION_KEY), saved);
    assert.equal(warn.mock.callCount(), 1);
    for (const enabled of [false, true]) {
        store.setRestoreOpenTabsOnStartup(enabled);
        assert.equal(values.get(SESSION_KEY), saved);
    }
});

for (const action of ['open a tab', 'disable restoration']) {
    test(`pending restoration respects user action: ${action}`, async (t) => {
        let resolve;
        const pending = new Promise((done) => {
            resolve = done;
        });
        const { store, getNotesByIds } = setup(t, {
            session: { noteIds: [1], activeNoteId: 1 },
            lookup: () => pending,
        });
        const restoring = store.restoreSession();
        assert.equal(getNotesByIds.mock.callCount(), 1);
        if (action === 'open a tab')
            store.openNote({ id: 2, title: 'Opened meanwhile' });
        else store.setRestoreOpenTabsOnStartup(false);
        resolve([{ id: 1, title: 'Saved tab' }]);
        await restoring;
        assert.deepEqual(
            store.tabs,
            action === 'open a tab'
                ? [{ id: 2, title: 'Opened meanwhile' }]
                : [],
        );
        assert.equal(store.activeNoteId, action === 'open a tab' ? 2 : null);
    });
}

test('preference changes persist without closing tabs or rewriting the session', (t) => {
    const { store, values, storage } = setup(t);
    store.openNote({ id: 1, title: 'Keep open' });
    store.saveSession();
    for (const enabled of [false, true]) {
        store.setRestoreOpenTabsOnStartup(enabled);
        assert.equal(store.restoreOpenTabsOnStartup, enabled);
        assert.equal(values.get(PREFERENCE_KEY), String(enabled));
        assert.deepEqual(store.tabs, [{ id: 1, title: 'Keep open' }]);
        assert.equal(store.activeNoteId, 1);
        assert.deepEqual(JSON.parse(values.get(SESSION_KEY)), {
            noteIds: [1],
            activeNoteId: 1,
        });
    }
    assert.deepEqual(
        storage.setItem.mock.calls.map((call) => call.arguments[0]),
        [SESSION_KEY, PREFERENCE_KEY, PREFERENCE_KEY],
    );
});

test('save stores only ordered IDs and active ID, reflecting reorders and closes', (t) => {
    const { store, values } = setup(t);
    for (const id of [1, 2, 3])
        store.openNote({
            id,
            title: `Title ${id}`,
            content: 'Private content',
        });
    store.activateNote(2);
    store.moveTab(3, 1);
    store.saveSession();
    assert.deepEqual(JSON.parse(values.get(SESSION_KEY)), {
        noteIds: [3, 1, 2],
        activeNoteId: 2,
    });
    store.closeNote(1);
    store.saveSession();
    assert.deepEqual(JSON.parse(values.get(SESSION_KEY)), {
        noteIds: [3, 2],
        activeNoteId: 2,
    });
    store.closeNote(2);
    store.saveSession();
    assert.deepEqual(JSON.parse(values.get(SESSION_KEY)), {
        noteIds: [3],
        activeNoteId: 3,
    });
    store.closeNotes([3]);
    store.saveSession();
    assert.deepEqual(JSON.parse(values.get(SESSION_KEY)), {
        noteIds: [],
        activeNoteId: null,
    });
});

test('storage read failures are nonfatal and skip metadata', async (t) => {
    const { store, storage, getNotesByIds, warn } = setup(t);
    storage.getItem.mock.mockImplementation(() => {
        throw new Error('Storage blocked');
    });
    await assert.doesNotReject(() => store.restoreSession());
    assert.deepEqual(store.tabs, []);
    assert.equal(store.activeNoteId, null);
    assert.equal(getNotesByIds.mock.callCount(), 0);
    assert.equal(warn.mock.callCount(), 1);
});

test('a fresh store restores the workspace saved by the previous instance', async (t) => {
    const { store } = setup(t, {
        lookup: async () => [
            { id: 1, title: 'Renamed while closed' },
            { id: 2, title: 'Second' },
        ],
    });
    store.openNote({ id: 1, title: 'Original title' });
    store.openNote({ id: 2, title: 'Second' });
    store.moveTab(2, 1);
    store.activateNote(1);
    store.saveSession();

    const pinia = createPinia();
    t.after(() => disposePinia(pinia));
    const restored = useTabsStore(pinia);
    await restored.restoreSession();
    assert.deepEqual(restored.tabs, [
        { id: 2, title: 'Second' },
        { id: 1, title: 'Renamed while closed' },
    ]);
    assert.equal(restored.activeNoteId, 1);
});

test('storage write failures are nonfatal for saves and preference changes', (t) => {
    const { store, storage, warn } = setup(t);
    store.openNote({ id: 1, title: 'Still open' });
    storage.setItem.mock.mockImplementation(() => {
        throw new Error('Storage full');
    });
    assert.doesNotThrow(() => store.saveSession());
    assert.doesNotThrow(() => store.setRestoreOpenTabsOnStartup(false));
    assert.equal(store.restoreOpenTabsOnStartup, false);
    assert.deepEqual(store.tabs, [{ id: 1, title: 'Still open' }]);
    assert.equal(store.activeNoteId, 1);
    assert.equal(warn.mock.callCount(), 2);
});
