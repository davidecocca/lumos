const test = require('node:test');
const assert = require('node:assert/strict');
const mountComposable = require('./helpers/mountComposable');

async function fixture(t) {
    const { ref } = await import('vue');
    const { useKanbanColumnDrag } =
        await import('../src/rendered/components/kanban/composables/useKanbanColumnDrag.js');
    const columnsDraft = ref(['todo', 'active', 'done'].map((id) => ({ id })));
    const disabled = ref(false);
    const listeners = new Map();
    const frames = new Map();
    let frameId = 0;
    const scroller = {
        scrollTop: 0,
        getBoundingClientRect: () => ({ top: -100, bottom: 400 }),
    };
    const rows = [0, 60, 120].map((top) => ({
        parentElement: scroller,
        getBoundingClientRect: () => ({ top, height: 48 }),
    }));
    scroller.querySelectorAll = () => rows;
    const globals = {
        document: {
            addEventListener: (name, callback) => listeners.set(name, callback),
            removeEventListener: (name) => listeners.delete(name),
        },
        requestAnimationFrame: (callback) => {
            frames.set(++frameId, callback);
            return frameId;
        },
        cancelAnimationFrame: (id) => frames.delete(id),
    };
    const previous = Object.fromEntries(
        Object.keys(globals).map((key) => [key, globalThis[key]]),
    );
    Object.assign(globalThis, globals);
    const { result: actions, unmount } = await mountComposable(() =>
        useKanbanColumnDrag({ columnsDraft, disabled }),
    );
    t.after(() => {
        unmount();
        for (const [key, value] of Object.entries(previous)) {
            if (value === undefined) delete globalThis[key];
            else globalThis[key] = value;
        }
    });
    const event = (y, index = 0) => ({
        clientY: y,
        button: 0,
        pointerId: 1,
        preventDefault() {},
        currentTarget: {
            focus() {},
            closest: () => rows[index],
        },
    });
    return {
        actions,
        disabled,
        columnDrag: actions.columnDrag,
        listeners,
        frames,
        scroller,
        tick: () => {
            const callbacks = [...frames.values()];
            frames.clear();
            callbacks.forEach((callback) => callback());
        },
        event,
        ids: () => Array.from(columnsDraft.value, (column) => column.id),
        unmount,
    };
}

test('pointer dragging reorders immediately and keeps the row under the pointer', async (t) => {
    const { actions, event, ids, columnDrag, listeners, frames, tick } =
        await fixture(t);
    actions.startColumnDrag(event(24), 'todo');
    actions.moveColumnDrag(event(144));
    tick();
    assert.deepEqual(ids(), ['active', 'done', 'todo']);
    assert.equal(columnDrag.value.offset, 0);
    actions.moveColumnDrag(event(159));
    actions.finishColumnDrag(event(159));
    assert.deepEqual(ids(), ['active', 'done', 'todo']);
    assert.equal(columnDrag.value, null);
    assert.equal(listeners.size, 0);
    assert.equal(frames.size, 0);
});

test('cancelling restores original order and dragging can move upwards', async (t) => {
    const { actions, event, ids, tick } = await fixture(t);
    actions.startColumnDrag(event(144, 2), 'done');
    actions.moveColumnDrag(event(24));
    tick();
    assert.deepEqual(ids(), ['done', 'todo', 'active']);
    actions.cancelColumnDrag();
    assert.deepEqual(ids(), ['todo', 'active', 'done']);
});

test('dragging near the edge scrolls long lists', async (t) => {
    const { actions, event, scroller, tick } = await fixture(t);
    actions.startColumnDrag(event(24), 'todo');
    actions.moveColumnDrag(event(390));
    tick();
    assert.equal(scroller.scrollTop, 10);
    actions.clearColumnDrag();
});

test('keyboard reordering respects boundaries and disabled state', async (t) => {
    const { actions, disabled, ids } = await fixture(t);
    actions.reorderColumn(0, -1);
    actions.reorderColumn(2, 1);
    assert.deepEqual(ids(), ['todo', 'active', 'done']);
    actions.reorderColumn(1, -1);
    assert.deepEqual(ids(), ['active', 'todo', 'done']);
    disabled.value = true;
    actions.reorderColumn(0, 1);
    assert.deepEqual(ids(), ['active', 'todo', 'done']);
});

test('Escape restores order and unmount removes pointer listeners and frames', async (t) => {
    const { actions, event, ids, tick, listeners, frames, unmount } =
        await fixture(t);
    actions.startColumnDrag(event(24), 'todo');
    actions.moveColumnDrag(event(144));
    tick();
    listeners.get('keydown')({
        key: 'Escape',
        preventDefault() {},
        stopPropagation() {},
    });
    assert.deepEqual(ids(), ['todo', 'active', 'done']);
    actions.startColumnDrag(event(24), 'todo');
    unmount();
    assert.equal(listeners.size, 0);
    assert.equal(frames.size, 0);
});
