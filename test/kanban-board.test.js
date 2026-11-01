const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');

async function boardFixture() {
    const frames = new Map();
    const events = [];
    const watchers = [];
    let nextFrame = 0;
    let cleanup;
    const props = {
        disabled: false,
        cards: null,
        board: {
            cards: [
                { id: 1, columnId: 1 },
                { id: 2, columnId: 2 },
            ],
        },
    };
    const element = {
        scrollLeft: 0,
        scrollWidth: 920,
        clientWidth: 500,
        getBoundingClientRect: () => ({
            left: 0,
            right: 500,
            top: 0,
            bottom: 300,
            width: 500,
        }),
        querySelectorAll: () => columns,
        contains: (item) => columns.includes(item),
    };
    const columns = [1, 2, 3].map((id, index) => ({
        dataset: { columnId: String(id) },
        getBoundingClientRect: () => ({
            left: index * 266 - element.scrollLeft,
            right: index * 266 + 250 - element.scrollLeft,
            top: 0,
            bottom: 300,
        }),
        querySelectorAll: () =>
            (props.cards ?? props.board.cards)
                .filter((card) => card.columnId === id)
                .map((card) => ({
                    dataset: { cardId: String(card.id) },
                    getBoundingClientRect: () => ({ top: 100, height: 80 }),
                })),
    }));
    const source = await fs.readFile(
        path.resolve(
            __dirname,
            '../src/rendered/components/kanban/KanbanBoard.vue',
        ),
        'utf8',
    );
    const script = source.slice(
        source.indexOf('const draggedId'),
        source.indexOf('</script>'),
    );
    const actions = vm.runInNewContext(
        script +
            '\n({ viewport, target, draggedId, startDrag, overBoard, leaveBoard, refreshDragTarget, drop, clearDrag, cardsFor });',
        {
            props,
            ref: (value) => ({ value }),
            computed: (get) => ({
                get value() {
                    return get();
                },
            }),
            watch: (source, callback) => watchers.push(callback),
            onBeforeUnmount: (callback) => {
                cleanup = callback;
            },
            emit: (...args) => events.push(JSON.parse(JSON.stringify(args))),
            requestAnimationFrame: (callback) => {
                frames.set(++nextFrame, callback);
                return nextFrame;
            },
            cancelAnimationFrame: (id) => frames.delete(id),
        },
    );
    actions.viewport.value = element;
    const dragEvent = (x, y = 150, currentTarget = element) => ({
        clientX: x,
        clientY: y,
        currentTarget,
        relatedTarget: null,
        dataTransfer: { setData() {} },
        preventDefault() {},
    });
    const advance = (time) => {
        const callbacks = [...frames.values()];
        frames.clear();
        for (const callback of callbacks) callback(time);
    };
    return {
        actions,
        props,
        element,
        columns,
        frames,
        events,
        watchers,
        dragEvent,
        advance,
        cleanup: () => cleanup(),
    };
}

test('drag-edge scrolling reaches an offscreen empty column and preserves drop targets', async () => {
    const { actions, element, columns, frames, events, dragEvent, advance } =
        await boardFixture();
    actions.startDrag(dragEvent(100), 1);
    actions.overBoard(dragEvent(490));
    for (let frame = 1; frame <= 12; frame++) advance(frame * 16);
    assert.ok(
        element.scrollLeft > 42,
        'scrolls continuously without another dragover event',
    );
    assert.equal(actions.target.value.columnId, 3);
    assert.equal(actions.target.value.beforeId, null);
    actions.drop(dragEvent(490, 150, columns[2]), 3);
    assert.deepEqual(events, [
        ['move-card', { cardId: 1, columnId: 3, beforeId: null }],
    ]);
    assert.equal(frames.size, 0);
    assert.equal(actions.draggedId.value, null);
});

test('drag scrolling uses the visible edge when a right-side panel is open', async () => {
    const { actions, props, element, dragEvent, advance, cleanup } =
        await boardFixture();
    props.endSpace = 200;
    actions.startDrag(dragEvent(100), 1);
    actions.overBoard(dragEvent(290));
    advance(16);
    assert.ok(element.scrollLeft > 0);
    cleanup();
});

test('drag scrolling stops at boundaries, on leaving, on disabling, and on unmount', async () => {
    const {
        actions,
        props,
        element,
        frames,
        watchers,
        dragEvent,
        advance,
        cleanup,
    } = await boardFixture();
    actions.startDrag(dragEvent(100), 1);
    actions.overBoard(dragEvent(250));
    advance(16);
    assert.equal(element.scrollLeft, 0, 'no scrolling away from the edges');
    assert.equal(frames.size, 0);
    actions.overBoard(dragEvent(490));
    for (let frame = 1; frame <= 100; frame++) advance(frame * 16);
    assert.equal(element.scrollLeft, element.scrollWidth - element.clientWidth);
    assert.equal(
        frames.size,
        0,
        'does not keep animating at the scroll boundary',
    );
    actions.overBoard(dragEvent(10));
    advance(1700);
    assert.ok(element.scrollLeft < 420, 'scrolls back toward earlier columns');
    actions.leaveBoard(dragEvent(-1));
    assert.equal(frames.size, 0);
    assert.equal(actions.target.value, null);
    actions.overBoard(dragEvent(10));
    props.disabled = true;
    watchers[1]();
    assert.equal(frames.size, 0);
    assert.equal(actions.draggedId.value, null);
    props.disabled = false;
    actions.startDrag(dragEvent(100), 1);
    actions.overBoard(dragEvent(490));
    cleanup();
    assert.equal(frames.size, 0);
    assert.equal(actions.draggedId.value, null);
});

test('filtered column counts and insertion targets use only visible cards', async () => {
    const { actions, props, columns, element, dragEvent } =
        await boardFixture();
    props.cards = [props.board.cards[0]];
    assert.equal(actions.cardsFor(2).length, 0);
    actions.startDrag(dragEvent(100), 1);
    actions.overBoard(dragEvent(300, 110));
    assert.equal(actions.target.value.columnId, 2);
    assert.equal(actions.target.value.beforeId, null);
    element.scrollLeft = 260;
    actions.refreshDragTarget();
    assert.equal(actions.target.value.columnId, 3);
    actions.drop(dragEvent(300, 110, columns[2]), 3);
    assert.equal(actions.draggedId.value, null);
});
