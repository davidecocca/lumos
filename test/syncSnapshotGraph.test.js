const test = require('node:test');
const assert = require('node:assert/strict');
const {
    isDescendant,
    newestSnapshot,
} = require('../src/main/services/syncSnapshotGraph');

test('recognizes descendants through an immutable snapshot chain', () => {
    const snapshots = [
        { id: 'first', parentId: null },
        { id: 'second', parentId: 'first' },
        { id: 'third', parentId: 'second' },
    ];
    const byId = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));

    assert.equal(isDescendant(byId.get('third'), 'first', byId), true);
    assert.equal(isDescendant(byId.get('second'), 'third', byId), false);
});

test('does not treat independent branches or cycles as descendants', () => {
    const snapshots = [
        { id: 'first', parentId: null },
        { id: 'local', parentId: 'first' },
        { id: 'remote', parentId: 'first' },
        { id: 'cycle-a', parentId: 'cycle-b' },
        { id: 'cycle-b', parentId: 'cycle-a' },
    ];
    const byId = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));

    assert.equal(isDescendant(byId.get('remote'), 'local', byId), false);
    assert.equal(isDescendant(byId.get('cycle-a'), 'first', byId), false);
});

test('selects the newest valid snapshot by creation time', () => {
    const selected = newestSnapshot([
        { id: 'older', createdAt: '2026-09-14T08:00:00.000Z' },
        { id: 'newest', createdAt: '2026-09-14T10:00:00.000Z' },
        { id: 'middle', createdAt: '2026-09-14T09:00:00.000Z' },
    ]);

    assert.equal(selected.id, 'newest');
});
