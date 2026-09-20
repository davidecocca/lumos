// Holds the in-memory ID of the workspace currently active in the main process.
// It is initialized at startup and updated when the user switches workspaces.

const DEFAULT_WORKSPACE_ID = 'default';

let activeWorkspaceId = DEFAULT_WORKSPACE_ID;

function getActiveWorkspaceId() {
    return activeWorkspaceId;
}

function setActiveWorkspaceId(workspaceId) {
    if (typeof workspaceId !== 'string' || !workspaceId.trim()) {
        throw new Error('Invalid workspace.');
    }

    activeWorkspaceId = workspaceId;
}

module.exports = {
    DEFAULT_WORKSPACE_ID,
    getActiveWorkspaceId,
    setActiveWorkspaceId,
};
