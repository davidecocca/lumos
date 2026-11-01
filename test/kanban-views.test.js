const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const { parse, compileScript, compileTemplate } = require('@vue/compiler-sfc');
const mountComposable = require('./helpers/mountComposable');

test('create and rename board dialogs compile with distinct forms and fixed actions', async () => {
    for (const [name, form, action] of [
        ['CreateBoardDialog', 'kanban-create-board-form', 'create'],
        ['RenameBoardDialog', 'kanban-rename-board-form', 'save'],
    ]) {
        const filename = path.resolve(
            __dirname,
            `../src/rendered/components/kanban/dialogs/${name}.vue`,
        );
        const source = await fs.readFile(filename, 'utf8');
        const { descriptor, errors } = parse(source, { filename });
        assert.deepEqual(errors, []);
        const script = compileScript(descriptor, { id: name });
        const template = compileTemplate({
            source: descriptor.template.content,
            filename,
            id: name,
            compilerOptions: { bindingMetadata: script.bindings },
        });
        assert.deepEqual(template.errors, []);
        assert.equal(script.bindings.mode, undefined);
        assert.ok(source.includes(`id="${form}"`));
        assert.ok(source.includes(`form="${form}"`));
        assert.ok(source.includes(`@submit.prevent="emit('${action}')"`));
        assert.ok(source.includes(':disabled="disabled || !name.trim()"'));
        assert.ok(source.includes(':persistent="busy"'));
    }
});

async function fixture(t, view, api) {
    const vue = await import('vue');
    const directory = '../src/rendered/components/kanban/';
    const dependencies = {};
    for (const file of [
        'composables/useKanbanBoardData.js',
        'composables/useKanbanCardDraft.js',
        'composables/useKanbanCardActions.js',
        'utils/dates.js',
        'utils/filters.js',
    ])
        Object.assign(dependencies, await import(directory + file));
    const route = vue.reactive({
        params: view === 'KanbanBoardView' ? { boardId: '12' } : {},
    });
    const workspaceStore = vue.reactive({
        currentWorkspaceId: 0,
        switching: false,
    });
    const navigation = [];
    const intervals = new Set();
    const listeners = new Set();
    const filename = path.resolve(
        __dirname,
        `../src/rendered/views/${view}.vue`,
    );
    const { descriptor, errors } = parse(await fs.readFile(filename, 'utf8'), {
        filename,
    });
    assert.deepEqual(errors, []);
    const compiled = compileScript(descriptor, { id: view });
    const template = compileTemplate({
        source: descriptor.template.content,
        filename,
        id: view,
        compilerOptions: { bindingMetadata: compiled.bindings },
    });
    assert.deepEqual(template.errors, []);
    for (const [, name] of compiled.content.matchAll(
        /import (\w+) from ['"][^'"]+\.vue['"]/g,
    ))
        dependencies[name] = {};
    const script = compiled.content
        .replace(/import[\s\S]*?from\s+['"][^'"]+['"];?/g, '')
        .replace('export default', 'const component =');
    const component = vm.runInNewContext(
        script + '\ncomponent;',
        {
            ...vue,
            ...dependencies,
            useRoute: () => route,
            useRouter: () => ({
                push: async (target) => {
                    navigation.push(JSON.parse(JSON.stringify(target)));
                },
            }),
            useWorkspaceStore: () => workspaceStore,
            useFoldersStore: () => ({ folders: [] }),
            window: {
                api,
                setInterval(callback) {
                    intervals.add(callback);
                    return callback;
                },
                clearInterval(callback) {
                    intervals.delete(callback);
                },
                addEventListener(event, callback) {
                    listeners.add(callback);
                },
                removeEventListener(event, callback) {
                    listeners.delete(callback);
                },
            },
        },
        { filename },
    );
    const { result: state, unmount } = await mountComposable(() =>
        component.setup({}, { expose() {} }),
    );
    t.after(unmount);
    const settle = async () => {
        for (let i = 0; i < 10; i++) await vue.nextTick();
    };
    await settle();
    return {
        state,
        workspaceStore,
        navigation,
        route,
        settle,
        unmount,
        intervals,
        listeners,
    };
}

test('Kanban list owns board management and creation navigates to the board route', async (t) => {
    const calls = [];
    const api = {
        listKanbanBoards: async (payload) => {
            calls.push(['list', payload]);
            return [{ id: 12, name: 'Board' }];
        },
        createKanbanBoard: async (payload) => {
            calls.push(['create', payload]);
            return { id: 13 };
        },
        renameKanbanBoard: async (payload) => {
            calls.push(['rename', payload]);
        },
        duplicateKanbanBoard: async (payload) => {
            calls.push(['duplicate', payload]);
        },
        deleteKanbanBoard: async (payload) => {
            calls.push(['delete', payload]);
        },
    };
    const {
        state,
        navigation,
        workspaceStore,
        settle,
        unmount,
        intervals,
        listeners,
    } = await fixture(t, 'KanbanView', api);
    assert.equal(state.boards.value[0].id, 12);
    assert.equal(state.cardDraft, undefined);
    state.openCreateBoard();
    state.nameDraft.value = 'New board';
    await state.createBoard();
    assert.deepEqual(navigation[0], {
        name: 'kanban-board',
        params: { boardId: 13 },
    });
    const board = state.boards.value[0];
    state.openRenameBoard(board);
    state.nameDraft.value = 'Renamed';
    await state.renameBoard();
    await state.duplicateBoard(board);
    state.openBoardDelete(board);
    await state.deleteBoard();
    assert.deepEqual(
        JSON.parse(
            JSON.stringify(
                calls.filter(([action]) =>
                    ['rename', 'duplicate', 'delete'].includes(action),
                ),
            ),
        ),
        [
            ['rename', { id: 12, workspaceId: 0, name: 'Renamed' }],
            ['duplicate', { workspaceId: 0, id: 12 }],
            ['delete', { workspaceId: 0, id: 12 }],
        ],
    );
    workspaceStore.currentWorkspaceId = 1;
    await settle();
    assert.deepEqual(calls.at(-1), ['list', { workspaceId: 1 }]);
    unmount();
    assert.equal(intervals.size, 0);
    assert.equal(listeners.size, 0);
});

test('single-board view loads details, persists edits, and returns to the list after deletion', async (t) => {
    const calls = [];
    const board = {
        id: 12,
        workspace_id: 0,
        name: 'Board',
        columns: [{ id: 1, name: 'To do', progressType: 'not-started' }],
        cards: [],
    };
    const api = {
        getKanbanBoard: async (payload) => {
            calls.push(['get', payload]);
            return { ...board, id: payload.id };
        },
        getKanbanOptions: async () => ({ tags: [], notes: [] }),
        renameKanbanBoard: async (payload) => {
            calls.push(['rename', payload]);
            return { ...board, name: payload.name };
        },
        saveKanbanColumns: async (payload) => {
            calls.push(['columns', payload]);
            return board;
        },
        deleteKanbanBoard: async (payload) => {
            calls.push(['delete', payload]);
        },
    };
    const { state, navigation, route, workspaceStore, settle } = await fixture(
        t,
        'KanbanBoardView',
        api,
    );
    assert.deepEqual(calls[0], ['get', { workspaceId: 0, id: 12 }]);
    assert.equal(state.boards, undefined);
    state.openNameDialog();
    state.nameDraft.value = 'Renamed';
    await state.saveName();
    assert.equal(state.board.value.name, 'Renamed');
    state.openColumns();
    await state.saveColumns();
    state.openCard(null, 1);
    assert.equal(state.cardPanel.value, true);
    route.params.boardId = '13';
    await settle();
    assert.equal(state.board.value.id, 13);
    assert.equal(state.cardPanel.value, false);
    await state.deleteBoard();
    assert.deepEqual(navigation[0], { name: 'kanban' });
    workspaceStore.currentWorkspaceId = 1;
    await settle();
    assert.deepEqual(calls.at(-1), ['get', { workspaceId: 1, id: 13 }]);
});

test('Kanban routes resolve list and board URLs to separate views', async () => {
    const routerTools = await import('vue-router');
    const source = await fs.readFile(
        path.resolve(__dirname, '../src/rendered/router/router.js'),
        'utf8',
    );
    const componentNames = [
        'HomeView',
        'ChatView',
        'SettingsView',
        'EditorView',
        'KanbanView',
        'KanbanBoardView',
    ];
    const components = Object.fromEntries(
        componentNames.map((name) => [name, { name }]),
    );
    const router = vm.runInNewContext(
        source
            .replace(/import[\s\S]*?from\s+['"][^'"]+['"];?/g, '')
            .replace('export default router;', 'router;'),
        { ...routerTools, ...components },
    );
    assert.equal(router.resolve('/kanban').name, 'kanban');
    assert.equal(router.resolve('/kanban/12').name, 'kanban-board');
    assert.equal(
        router.resolve({ name: 'kanban-board', params: { boardId: 12 } }).path,
        '/kanban/12',
    );
    assert.equal(
        router.resolve('/kanban').matched[0].components.default,
        components.KanbanView,
    );
    assert.equal(
        router.resolve('/kanban/12').matched[0].components.default,
        components.KanbanBoardView,
    );
});
