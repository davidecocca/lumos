const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { createRequire } = require('node:module');

async function loadModule(relativePath, overrides, globals = {}) {
    const filename = path.resolve(__dirname, relativePath);
    const realRequire = createRequire(filename);
    const module = { exports: {} };
    vm.runInNewContext(
        await fs.readFile(filename, 'utf8'),
        {
            module,
            console,
            require: (id) => overrides[id] || realRequire(id),
            ...globals,
        },
        { filename },
    );
    return module.exports;
}

async function fixture(t) {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'lumos-kanban-'));
    const context = { active: 0 };
    const clock = { now: Date.parse('2026-09-20T10:00:00.000Z') };
    class TestDate extends Date {
        constructor(...args) {
            super(...(args.length ? args : [clock.now]));
        }
    }
    const workspaceContext = {
        DEFAULT_WORKSPACE_ID: 0,
        getActiveWorkspaceId: () => context.active,
    };
    const db = await loadModule('../src/main/database/db.js', {
        '../storagePaths': {
            initializeStorage() {},
            getDatabasePath: () => path.join(directory, 'test.sqlite'),
        },
        '../workspaceContext': workspaceContext,
    });
    t.after(async () => {
        await new Promise((resolve, reject) =>
            db.close((error) => (error ? reject(error) : resolve())),
        );
        await fs.rm(directory, { recursive: true });
    });
    await db.ready;
    const overrides = {
        '../../db': db,
        '../../../workspaceContext': workspaceContext,
    };
    const modules = {};
    for (const name of ['shared', 'options', 'columns', 'cards', 'boards']) {
        modules[name] = await loadModule(
            `../src/main/database/crud/kanban/${name}.js`,
            overrides,
            { Date: TestDate },
        );
        overrides[`./${name}`] = modules[name];
    }
    const kanban = {
        ...modules.boards,
        saveColumns: modules.columns.saveColumns,
        saveCard: modules.cards.saveCard,
        moveCard: modules.cards.moveCard,
        deleteCard: modules.cards.deleteCard,
        getOptions: modules.options.getOptions,
    };
    const run = (sql, params = []) =>
        new Promise((resolve, reject) =>
            db.run(sql, params, (error) => (error ? reject(error) : resolve())),
        );
    const all = (sql, params = []) =>
        new Promise((resolve, reject) =>
            db.all(sql, params, (error, rows) =>
                error ? reject(error) : resolve(rows),
            ),
        );
    const board = await kanban.create({
        workspaceId: 0,
        name: 'Release',
    });
    return { kanban, run, all, board, context, clock };
}

const plain = (value) => JSON.parse(JSON.stringify(value));
const description = {
    type: 'doc',
    content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Details' }] },
    ],
};
const payload = (board, changes = {}) => ({
    workspaceId: board.workspace_id,
    id: board.id,
    ...changes,
});
const card = (board, id = 'a', column = 0) => ({
    title: `Task ${id}`,
    columnId: board.columns[column].id,
    description,
});

test('new schema stores boards, ordered columns, and cards separately with foreign keys', async (t) => {
    const { kanban, all, run, board } = await fixture(t);
    const fields = (await all('PRAGMA table_info(kanban_boards)')).map(
        (row) => row.name,
    );
    assert.ok(
        !fields.includes('cards_json') && !fields.includes('columns_json'),
    );
    assert.deepEqual(plain(board.columns.map((column) => column.name)), [
        'To do',
        'In progress',
        'Blocked',
        'In review',
        'Done',
    ]);
    const saved = await kanban.saveCard(payload(board, { card: card(board) }));
    assert.equal((await all('SELECT * FROM kanban_cards')).length, 1);
    assert.deepEqual(plain(await kanban.get(payload(saved))), plain(saved));
    await assert.rejects(
        run('UPDATE kanban_cards SET column_id = ? WHERE board_id = ?', [
            'missing',
            board.id,
        ]),
        /FOREIGN KEY/,
    );
    const other = await kanban.create({
        workspaceId: 0,
        name: 'Other',
    });
    await assert.rejects(
        run('UPDATE kanban_cards SET column_id = ? WHERE board_id = ?', [
            other.columns[0].id,
            board.id,
        ]),
        /FOREIGN KEY/,
    );
    assert.deepEqual(await all('PRAGMA foreign_key_check'), []);
});

test('editing a card writes only its row; renaming a board writes no cards', async (t) => {
    const { kanban, run, all, board, clock } = await fixture(t);
    let saved = await kanban.saveCard(payload(board, { card: card(board) }));
    saved = await kanban.saveCard(payload(saved, { card: card(board, 'b') }));
    const untouched = plain(saved.cards[1]);
    await run('CREATE TABLE card_writes (id INTEGER)');
    await run(
        'CREATE TRIGGER audit_cards AFTER UPDATE ON kanban_cards BEGIN INSERT INTO card_writes VALUES (NEW.id); END',
    );
    clock.now += 60000;
    saved = await kanban.saveCard(
        payload(saved, { card: { ...saved.cards[0], title: 'Updated' } }),
    );
    assert.deepEqual(await all('SELECT id FROM card_writes'), [{ id: 1 }]);
    assert.deepEqual(plain(saved.cards[1]), untouched);
    saved = await kanban.rename(payload(saved, { name: ' Renamed ' }));
    assert.equal(saved.name, 'Renamed');
    assert.equal((await all('SELECT * FROM card_writes')).length, 1);
    assert.equal((await kanban.list({ workspaceId: 0 }))[0].card_count, 2);
});

test('column editing preserves order and affects only cards whose progress type changed', async (t) => {
    const { kanban, board, clock } = await fixture(t);
    let saved = await kanban.saveCard(payload(board, { card: card(board) }));
    saved = await kanban.saveCard(
        payload(saved, { card: card(board, 'b', 1) }),
    );
    const untouched = plain(saved.cards[1]);
    const columns = plain(saved.columns).reverse();
    columns.find((column) => column.id === board.columns[0].id).progressType =
        'complete';
    clock.now += 60000;
    saved = await kanban.saveColumns(payload(saved, { columns }));
    assert.deepEqual(plain(saved.columns), columns);
    assert.equal(saved.cards[0].completedAt, new Date(clock.now).toISOString());
    assert.deepEqual(plain(saved.cards[1]), untouched);
    const completedAt = saved.cards[0].completedAt;
    columns.find((column) => column.id === board.columns[0].id).name =
        'Shipped';
    saved = await kanban.saveColumns(payload(saved, { columns }));
    assert.equal(saved.cards[0].completedAt, completedAt);
    columns.find((column) => column.id === board.columns[0].id).progressType =
        'blocked';
    saved = await kanban.saveColumns(payload(saved, { columns }));
    assert.equal(saved.cards[0].completedAt, null);
});

test('moving cards preserves ordering, completion, and unaffected cards', async (t) => {
    const { kanban, board, clock } = await fixture(t);
    let saved = board;
    for (const id of ['a', 'b', 'c'])
        saved = await kanban.saveCard(
            payload(saved, { card: card(board, id) }),
        );
    const a = plain(saved.cards[0]);
    saved = await kanban.moveCard(
        payload(saved, {
            cardId: 3,
            columnId: board.columns[0].id,
            beforeId: 1,
        }),
    );
    assert.deepEqual(plain(saved.cards.map((card) => card.id)), [3, 1, 2]);
    assert.deepEqual(plain(saved.cards[1]), a);
    clock.now += 60000;
    saved = await kanban.moveCard(
        payload(saved, { cardId: 3, columnId: board.columns[4].id }),
    );
    assert.equal(
        saved.cards.find((card) => card.id === 3).completedAt,
        new Date(clock.now).toISOString(),
    );
    saved = await kanban.moveCard(
        payload(saved, { cardId: 3, columnId: board.columns[2].id }),
    );
    assert.equal(saved.cards.find((card) => card.id === 3).completedAt, null);
    // Card-menu duplication inserts beside its source, even across the global array's column boundary.
    saved = await kanban.saveCard(
        payload(saved, { card: card(board, 'copy'), beforeId: 2 }),
    );
    assert.deepEqual(plain(saved.cards.map((card) => card.id)), [1, 4, 2, 3]);
});

test('targeted concurrent writes succeed and failed mutations roll back child writes and metadata', async (t) => {
    const { kanban, board } = await fixture(t);
    const results = await Promise.allSettled([
        kanban.saveCard(payload(board, { card: card(board) })),
        kanban.rename(payload(board, { name: 'Concurrent' })),
    ]);
    assert.equal(
        results.filter((result) => result.status === 'fulfilled').length,
        2,
    );
    assert.equal(
        results.filter((result) => result.status === 'rejected').length,
        0,
    );
    const saved = await kanban.get(payload(board));
    assert.equal(saved.name, 'Concurrent');
    assert.equal(saved.cards.length, 1);
    assert.ok(!('revision' in saved));
    await assert.rejects(
        kanban.saveCard(
            payload(saved, { card: { ...card(board), columnId: 'missing' } }),
        ),
        /column/,
    );
    assert.deepEqual(plain(await kanban.get(payload(saved))), plain(saved));
    await kanban.deleteBoard(payload(board));
    await assert.rejects(kanban.deleteBoard(payload(board)), /not found/);
    await assert.rejects(
        kanban.rename(payload(board, { name: 'Deleted' })),
        /not found/,
    );
});

test('nonempty columns cannot be deleted and board deletion cascades to cards and tags', async (t) => {
    const { kanban, board, all } = await fixture(t);
    const saved = await kanban.saveCard(
        payload(board, { card: { ...card(board), tags: ['Feature'] } }),
    );
    await assert.rejects(
        kanban.saveColumns(payload(saved, { columns: saved.columns.slice(1) })),
        /Move the cards/,
    );
    assert.deepEqual(plain(await kanban.get(payload(saved))), plain(saved));
    await kanban.deleteBoard(payload(saved));
    assert.deepEqual(await all('SELECT * FROM kanban_columns'), []);
    assert.deepEqual(await all('SELECT * FROM kanban_cards'), []);
    assert.deepEqual(
        plain((await kanban.getOptions({ workspaceId: 0 })).tags),
        [],
    );
});

test('tags are canonicalized and disappear only after their last saved use', async (t) => {
    const { kanban, board } = await fixture(t);
    let saved = await kanban.saveCard(
        payload(board, {
            card: { ...card(board), tags: [' Feature ', 'feature'] },
        }),
    );
    saved = await kanban.saveCard(
        payload(saved, { card: { ...card(board, 'b'), tags: ['FEATURE'] } }),
    );
    assert.deepEqual(plain(saved.cards[1].tags), ['Feature']);
    saved = await kanban.deleteCard(payload(saved, { cardId: 1 }));
    assert.deepEqual(
        plain((await kanban.getOptions({ workspaceId: 0 })).tags),
        ['Feature'],
    );
    saved = await kanban.saveCard(
        payload(saved, { card: { ...saved.cards[0], tags: [] } }),
    );
    assert.deepEqual(
        plain((await kanban.getOptions({ workspaceId: 0 })).tags),
        [],
    );
});

test('workspace isolation, note links, and stale link cleanup remain intact', async (t) => {
    const { kanban, board, context, run } = await fixture(t);
    await run("INSERT INTO workspaces (id, name) VALUES (1, 'Other')");
    await run(
        "INSERT INTO notes (id, workspace_id, title, content_json, content_text) VALUES (1, 0, 'Note', '{}', ''), (2, 1, 'Private', '{}', '')",
    );
    await assert.rejects(
        kanban.saveCard(
            payload(board, { card: { ...card(board), noteIds: [2] } }),
        ),
        /Linked note/,
    );
    let saved = await kanban.saveCard(
        payload(board, { card: { ...card(board), noteIds: [1] } }),
    );
    await run('UPDATE notes SET workspace_id = 1 WHERE id = 1');
    saved = await kanban.saveCard(payload(saved, { card: saved.cards[0] }));
    assert.deepEqual(plain(saved.cards[0].noteIds), []);
    context.active = 1;
    await assert.rejects(
        async () => kanban.get(payload(saved)),
        /workspace has changed/,
    );
    await assert.rejects(
        kanban.get({ workspaceId: 1, id: saved.id }),
        /not found/,
    );
    await assert.rejects(
        kanban.deleteCard({
            ...payload(saved),
            workspaceId: 1,
            cardId: 1,
        }),
        /not found/,
    );
});

test('duplication is atomic, remaps relationships, and preserves descriptions and ordering', async (t) => {
    const { kanban, board, all } = await fixture(t);
    let saved = await kanban.saveCard(
        payload(board, {
            card: { ...card(board), tags: ['Feature'], dueDate: '2026-10-11' },
        }),
    );
    saved = await kanban.saveCard(
        payload(saved, { card: card(board, 'b', 4) }),
    );
    const copy = await kanban.duplicate(payload(saved));
    assert.equal(copy.name, 'Release (copy)');
    assert.equal(copy.cards.length, 2);
    assert.deepEqual(
        plain(copy.cards.map((card) => card.title)),
        plain(saved.cards.map((card) => card.title)),
    );
    assert.ok(
        copy.cards.every(
            (card) => !saved.cards.some((source) => source.id === card.id),
        ),
    );
    assert.ok(
        copy.cards.every((card) =>
            copy.columns.some((column) => column.id === card.columnId),
        ),
    );
    assert.deepEqual(plain(copy.cards[0].description), description);
    assert.deepEqual(plain(copy.cards[0].tags), ['Feature']);
    assert.ok(copy.cards[1].completedAt);
    assert.deepEqual(plain(await kanban.get(payload(saved))), plain(saved));
    assert.deepEqual(await all('PRAGMA foreign_key_check'), []);
});

test('business rules remain enforced without recursively inspecting description nodes', async (t) => {
    const { kanban, board } = await fixture(t);
    for (const changes of [
        { title: '' },
        { dueDate: '2026-02-29' },
        { priority: 'critical' },
        { tags: [' '] },
    ])
        await assert.rejects(
            kanban.saveCard(
                payload(board, { card: { ...card(board), ...changes } }),
            ),
        );
    await assert.rejects(
        async () => kanban.saveColumns(payload(board, { columns: [] })),
        /columns/,
    );
    const custom = {
        type: 'doc',
        content: [{ type: 'customNode', marks: [{ type: 'customMark' }] }],
    };
    const saved = await kanban.saveCard(
        payload(board, {
            card: {
                ...card(board),
                description: custom,
                dueDate: '2028-02-29',
            },
        }),
    );
    assert.deepEqual(plain(saved.cards[0].description), custom);
    const unchanged = await kanban.saveCard(
        payload(saved, { card: saved.cards[0] }),
    );
    assert.deepEqual(plain(unchanged.cards), plain(saved.cards));
});

test('unknown historical card timestamps remain unknown after an unchanged save', async (t) => {
    const { kanban, board, run } = await fixture(t);
    let saved = await kanban.saveCard(
        payload(board, { card: card(board, 'a', 4) }),
    );
    await run(
        'UPDATE kanban_cards SET created_at = NULL, updated_at = NULL, completed_at = NULL',
    );
    saved = await kanban.get(payload(saved));
    saved = await kanban.saveCard(payload(saved, { card: saved.cards[0] }));
    assert.equal(saved.cards[0].createdAt, null);
    assert.equal(saved.cards[0].updatedAt, null);
    assert.equal(saved.cards[0].completedAt, null);
});

test('failed duplication rolls back the entire new board', async (t) => {
    const { kanban, board, run, all } = await fixture(t);
    const saved = await kanban.saveCard(
        payload(board, { card: { ...card(board), tags: ['Feature'] } }),
    );
    await run(
        "CREATE TRIGGER fail_copy BEFORE INSERT ON kanban_cards BEGIN SELECT RAISE(ABORT, 'Copy failed'); END",
    );
    await assert.rejects(kanban.duplicate(payload(saved)), /Copy failed/);
    assert.equal((await all('SELECT * FROM kanban_boards')).length, 1);
    assert.equal((await all('SELECT * FROM kanban_columns')).length, 5);
    assert.equal((await all('SELECT * FROM kanban_cards')).length, 1);
    assert.deepEqual(plain(await kanban.get(payload(saved))), plain(saved));
});

test('workspace deletion cascades through normalized board relationships', async (t) => {
    const { kanban, run, all, context } = await fixture(t);
    await run("INSERT INTO workspaces (id, name) VALUES (1, 'Other')");
    context.active = 1;
    let board = await kanban.create({ workspaceId: 1, name: 'Other' });
    board = await kanban.saveCard(
        payload(board, { card: { ...card(board), tags: ['Private'] } }),
    );
    await run('DELETE FROM workspaces WHERE id = 1');
    assert.deepEqual(await all('SELECT * FROM kanban_cards'), []);
    assert.deepEqual(
        await all('SELECT * FROM kanban_columns WHERE board_id = ?', [
            board.id,
        ]),
        [],
    );
    assert.deepEqual(
        plain((await kanban.getOptions({ workspaceId: 1 })).tags),
        [],
    );
    assert.deepEqual(await all('PRAGMA foreign_key_check'), []);
});

test('SQLite generates globally unique board, column, and card IDs without reuse', async (t) => {
    const { kanban, board } = await fixture(t);
    assert.equal(board.id, 1);
    assert.deepEqual(
        plain(board.columns.map((column) => column.id)),
        [1, 2, 3, 4, 5],
    );
    const other = await kanban.create({ workspaceId: 0, name: 'Other' });
    assert.equal(other.id, 2);
    assert.deepEqual(
        plain(other.columns.map((column) => column.id)),
        [6, 7, 8, 9, 10],
    );
    let saved = await kanban.saveColumns(
        payload(board, {
            columns: [
                ...board.columns,
                { id: -1, name: 'New', progressType: 'active' },
                { id: -2, name: 'Another', progressType: 'blocked' },
            ],
        }),
    );
    assert.deepEqual(
        plain(saved.columns.slice(-2).map((column) => column.id)),
        [11, 12],
    );
    saved = await kanban.saveCard(payload(saved, { card: card(saved) }));
    assert.equal(saved.cards[0].id, 1);
    const otherSaved = await kanban.saveCard(
        payload(other, { card: card(other) }),
    );
    assert.equal(otherSaved.cards[0].id, 2);
    await assert.rejects(
        kanban.saveCard(payload(saved, { card: otherSaved.cards[0] })),
        /Card not found/,
    );
    await assert.rejects(
        kanban.saveColumns(
            payload(saved, { columns: [...saved.columns, other.columns[0]] }),
        ),
        /Column not found/,
    );
    saved = await kanban.deleteCard(payload(saved, { cardId: 1 }));
    saved = await kanban.saveCard(payload(saved, { card: card(saved) }));
    assert.equal(saved.cards[0].id, 3);
    await kanban.deleteBoard(payload(otherSaved));
    assert.equal(
        (await kanban.create({ workspaceId: 0, name: 'Third' })).id,
        3,
    );
});

test('tag suggestions come directly from workspace cards without a registry or triggers', async (t) => {
    const { kanban, board, run, all, context } = await fixture(t);
    assert.deepEqual(
        await all(
            "SELECT name FROM sqlite_master WHERE name = 'kanban_tags' OR (type = 'trigger' AND name LIKE 'kanban_%tags%')",
        ),
        [],
    );
    const saved = await kanban.saveCard(
        payload(board, {
            card: { ...card(board), tags: ['Zulu', 'Feature', 'alpha'] },
        }),
    );
    const otherBoard = await kanban.create({
        workspaceId: 0,
        name: 'Other board',
    });
    const otherSaved = await kanban.saveCard(
        payload(otherBoard, {
            card: { ...card(otherBoard), tags: ['FEATURE'] },
        }),
    );
    // The query itself also deduplicates case-insensitively, not only card saves.
    await run('UPDATE kanban_cards SET tags_json = ? WHERE id = ?', [
        JSON.stringify(['feature']),
        otherSaved.cards[0].id,
    ]);
    assert.deepEqual(
        plain((await kanban.getOptions({ workspaceId: 0 })).tags).map((tag) =>
            tag.toLowerCase(),
        ),
        ['alpha', 'feature', 'zulu'],
    );
    await run("INSERT INTO workspaces (id, name) VALUES (1, 'Private')");
    context.active = 1;
    const privateBoard = await kanban.create({
        workspaceId: 1,
        name: 'Private',
    });
    await kanban.saveCard(
        payload(privateBoard, {
            card: { ...card(privateBoard), tags: ['Private'] },
        }),
    );
    assert.deepEqual(
        plain((await kanban.getOptions({ workspaceId: 1 })).tags),
        ['Private'],
    );
    context.active = 0;
    await kanban.deleteBoard(payload(saved));
    assert.deepEqual(
        plain((await kanban.getOptions({ workspaceId: 0 })).tags),
        ['feature'],
    );
    await kanban.deleteBoard(payload(otherSaved));
    assert.deepEqual(
        plain((await kanban.getOptions({ workspaceId: 0 })).tags),
        [],
    );
});
