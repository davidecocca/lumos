const test = require('node:test');
const assert = require('node:assert/strict');

test('card preview text and copies preserve rich content without sharing mutable data', async () => {
    const { extractDescriptionText, copyCard } =
        await import('../src/rendered/components/kanban/utils/cards.js');
    const description = {
        type: 'doc',
        content: [
            {
                type: 'paragraph',
                content: [
                    {
                        type: 'text',
                        text: 'Details',
                        marks: [{ type: 'bold' }],
                    },
                ],
            },
        ],
    };
    const original = {
        id: 'a',
        title: 'Task',
        columnId: 'todo',
        description,
        tags: ['Feature'],
        noteIds: [1],
    };
    assert.equal(extractDescriptionText(description), 'Details');
    const copy = copyCard(original);
    assert.equal(copy.id, undefined);
    assert.equal(copy.title, 'Task (copy)');
    assert.deepEqual(copy.description, description);
    copy.tags.push('Bug');
    copy.description.content[0].content[0].text = 'Changed';
    assert.deepEqual(original.tags, ['Feature']);
    assert.equal(extractDescriptionText(original.description), 'Details');
});

test('filtered reordering retains hidden cards and other columns', async () => {
    const { moveCard } =
        await import('../src/rendered/components/kanban/utils/cards.js');
    const { filterCards } =
        await import('../src/rendered/components/kanban/utils/filters.js');
    const cards = [
        { id: 'a', title: 'Visible A', columnId: 'todo' },
        { id: 'hidden', title: 'Hidden', columnId: 'todo' },
        { id: 'done', title: 'Other column', columnId: 'done' },
        { id: 'b', title: 'Visible B', columnId: 'todo' },
    ];
    const visible = filterCards({ cards, columns: [] }, { query: 'Visible' });
    assert.deepEqual(
        visible.map((card) => card.id),
        ['a', 'b'],
    );
    const moved = moveCard(cards, 'b', 'todo', 'a');
    assert.deepEqual(
        moved.map((card) => card.id),
        ['b', 'a', 'hidden', 'done'],
    );
    assert.equal(moveCard(cards, 'missing', 'todo'), cards);
    assert.equal(moveCard(cards, 'a', 'todo', 'a'), cards);
});

test('due filters respect completion, Monday–Sunday weeks, and local date boundaries', async (t) => {
    const { filterCards } =
        await import('../src/rendered/components/kanban/utils/filters.js');
    const { getCardDueDateDisplay, toLocalDateString } =
        await import('../src/rendered/components/kanban/utils/dates.js');
    const previous = process.env.TZ;
    process.env.TZ = 'America/Los_Angeles';
    t.after(() =>
        previous === undefined
            ? delete process.env.TZ
            : (process.env.TZ = previous),
    );
    assert.equal(
        toLocalDateString(new Date('2026-09-21T01:00:00Z')),
        '2026-09-20',
    );
    const columns = [
        { id: 'todo', progressType: 'not-started' },
        { id: 'done', progressType: 'complete' },
    ];
    const cards = [
        {
            id: 'overdue',
            columnId: 'todo',
            dueDate: '2026-09-18',
            tags: ['Feature'],
            priority: 'high',
        },
        { id: 'today', columnId: 'todo', dueDate: '2026-09-20' },
        { id: 'done', columnId: 'done', dueDate: '2026-09-18' },
        { id: 'next-week', columnId: 'todo', dueDate: '2026-09-21' },
    ];
    const ids = (filters) =>
        filterCards({ cards, columns }, filters, '2026-09-20').map(
            (card) => card.id,
        );
    assert.deepEqual(ids({ due: 'week' }), ['overdue', 'today']);
    assert.deepEqual(ids({ due: 'today' }), ['today']);
    assert.deepEqual(
        ids({ due: 'overdue', tags: ['feature'], priority: 'high' }),
        ['overdue'],
    );
    assert.equal(
        getCardDueDateDisplay(cards[0], columns, '2026-09-20').color,
        'error',
    );
    assert.notEqual(
        getCardDueDateDisplay(cards[2], columns, '2026-09-20').color,
        'error',
    );
    assert.equal(
        getCardDueDateDisplay(cards[3], columns, '2026-09-20').label,
        'Tomorrow',
    );
    assert.equal(
        getCardDueDateDisplay(
            { columnId: 'todo', dueDate: '2026-03-09' },
            columns,
            '2026-03-08',
        ).label,
        'Tomorrow',
    );
});
