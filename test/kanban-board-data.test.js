const test = require('node:test');
const assert = require('node:assert/strict');
const mountComposable = require('./helpers/mountComposable');

async function fixture(t, api) {
    const { reactive } = await import('vue');
    const { useKanbanBoardData } =
        await import('../src/rendered/components/kanban/composables/useKanbanBoardData.js');
    const workspaceStore = reactive({
        currentWorkspaceId: 0,
        switching: false,
    });
    const route = { params: {} };
    const { result: data, unmount } = await mountComposable(() =>
        useKanbanBoardData({
            api,
            workspaceStore,
            route,
            reset() {},
            hasDialog: () => true,
        }),
    );
    t.after(unmount);
    return { data, workspaceStore, route, unmount };
}

test('late board-list responses cannot replace the new workspace data', async (t) => {
    const pending = [];
    const { data, workspaceStore } = await fixture(t, {
        listKanbanBoards: ({ workspaceId }) =>
            new Promise((resolve) => pending.push({ workspaceId, resolve })),
    });
    const first = data.load();
    workspaceStore.currentWorkspaceId = 1;
    const second = data.load();
    pending[1].resolve([{ id: 'new' }]);
    await second;
    pending[0].resolve([{ id: 'old' }]);
    await first;
    assert.equal(data.boards.value[0].id, 'new');
    assert.equal(data.loading.value, false);
});

test('failed persistence leaves the board visible and routes the error to its dialog', async (t) => {
    const { data } = await fixture(t, {
        renameKanbanBoard: async () => {
            throw new Error('Save failed');
        },
    });
    data.board.value = {
        id: 'board',
        workspace_id: 0,
        cards: [],
    };
    assert.equal(await data.persist({ name: 'Draft name' }), false);
    assert.equal(data.board.value.id, 'board');
    assert.equal(data.board.value.name, undefined);
    assert.equal(data.dialogError.value, 'Save failed');
    assert.equal(data.busy.value, false);
});

test('unmount invalidates pending loads', async (t) => {
    let resolve;
    const { data, unmount } = await fixture(t, {
        listKanbanBoards: () =>
            new Promise((done) => {
                resolve = done;
            }),
    });
    const loading = data.load();
    unmount();
    resolve([{ id: 'late' }]);
    await loading;
    assert.deepEqual(data.boards.value, []);
});

test('a workspace reload invalidates a pending mutation callback', async (t) => {
    let resolve;
    const { data, workspaceStore } = await fixture(t, {
        listKanbanBoards: async () => [{ id: 'new' }],
    });
    let callbacks = 0;
    const saving = data.mutate(
        () =>
            new Promise((done) => {
                resolve = done;
            }),
        () => {
            callbacks++;
        },
    );
    workspaceStore.currentWorkspaceId = 1;
    await data.load();
    resolve({ id: 'old' });
    assert.equal(await saving, false);
    assert.equal(callbacks, 0);
    assert.equal(data.boards.value[0].id, 'new');
});

test('persistence dispatches targeted IPC payloads without sending a board snapshot', async (t) => {
    const calls = [];
    const api = { getKanbanOptions: async () => ({ tags: [] }) };
    for (const method of [
        'saveKanbanCard',
        'moveKanbanCard',
        'deleteKanbanCard',
        'saveKanbanColumns',
        'renameKanbanBoard',
    ]) {
        api[method] = async (payload) => {
            calls.push({ method, payload });
            return {
                id: 'board',
                workspace_id: 0,
                cards: [],
                columns: [],
            };
        };
    }
    const { data } = await fixture(t, api);
    data.board.value = {
        id: 'board',
        workspace_id: 0,
        cards: [{ id: 'untouched' }],
        columns: [{ id: 'column' }],
    };
    const card = { id: 'card', title: 'Edited', columnId: 'column' };
    assert.equal(await data.persist({ card }), true);
    assert.deepEqual(calls[0], {
        method: 'saveKanbanCard',
        payload: { id: 'board', workspaceId: 0, card },
    });
    await data.persist({
        move: { cardId: 'card', columnId: 'other', beforeId: null },
    });
    assert.deepEqual(calls[1], {
        method: 'moveKanbanCard',
        payload: {
            id: 'board',
            workspaceId: 0,
            cardId: 'card',
            columnId: 'other',
            beforeId: null,
        },
    });
    await data.persist({ deleteCardId: 'card' });
    assert.equal(calls[2].method, 'deleteKanbanCard');
    assert.equal(calls[2].payload.cardId, 'card');
    await data.persist({
        columns: [{ id: 'column', name: 'To do', progressType: 'not-started' }],
    });
    assert.equal(calls[3].method, 'saveKanbanColumns');
    await data.persist({ name: 'Renamed' });
    assert.equal(calls[4].method, 'renameKanbanBoard');
    assert.ok(calls.every(({ payload }) => !('cards' in payload)));
});

test('board routes send numeric database IDs over IPC', async (t) => {
    let received;
    const { data, route } = await fixture(t, {
        getKanbanBoard: async (payload) => {
            received = payload;
            return { id: 12, cards: [], columns: [] };
        },
        getKanbanOptions: async () => ({ tags: [], notes: [] }),
    });
    route.params.boardId = '12';
    await data.load();
    assert.deepEqual(received, { workspaceId: 0, id: 12 });
    assert.equal(data.board.value.id, 12);
});

test('a pending mutation blocks overlapping renderer writes', async (t) => {
    let finish;
    let writes = 0;
    const { data } = await fixture(t, {});
    const first = data.mutate(
        () => {
            writes++;
            return new Promise((resolve) => {
                finish = resolve;
            });
        },
        () => {},
    );
    assert.equal(data.busy.value, true);
    assert.equal(
        await data.mutate(
            async () => {
                writes++;
            },
            () => {},
        ),
        false,
    );
    assert.equal(writes, 1);
    finish();
    assert.equal(await first, true);
    assert.equal(data.busy.value, false);
});
