// Provides graph utilities for sync snapshots: follows parent links to detect compatible
// remote history and selects the newest snapshot available in a shared vault.

// Returns whether a snapshot descends from the specified ancestor, guarding against cycles
// or missing parent snapshots in an incomplete or corrupted snapshot graph.
function isDescendant(snapshot, ancestorId, snapshotsById) {
    let current = snapshot;
    const visited = new Set();
    while (current?.parentId && !visited.has(current.id)) {
        if (current.parentId === ancestorId) return true;
        visited.add(current.id);
        current = snapshotsById.get(current.parentId);
    }
    return false;
}

// Returns the newest snapshot by creation time, or undefined when the list is empty.
function newestSnapshot(snapshots) {
    return [...snapshots].sort((a, b) =>
        String(b.createdAt).localeCompare(String(a.createdAt)),
    )[0];
}

module.exports = { isDescendant, newestSnapshot };
