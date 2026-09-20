import { defineStore } from 'pinia';
import { useChatStore } from './chatStore';
import { useFoldersStore } from './foldersStore';
import { useTabsStore } from './tabsStore';

export const useWorkspaceStore = defineStore('workspaces', {
    state: () => ({
        workspaces: [],
        currentWorkspace: null,
        preferences: {
            startupMode: 'last-used',
            startupWorkspaceId: 'default',
            lastUsedWorkspaceId: 'default',
        },
        initialized: false,
        switching: false,
    }),
    getters: {
        currentWorkspaceId: (state) => state.currentWorkspace?.id || null,
    },
    actions: {
        async initialize() {
            if (this.initialized) return;

            const current = await window.api.getCurrentWorkspace();
            this.currentWorkspace = current.workspace;
            this.preferences = current.preferences;
            this.workspaces = await window.api.getWorkspaces();
            this.initialized = true;
        },
        async refresh() {
            this.workspaces = await window.api.getWorkspaces();
            this.preferences = await window.api.getWorkspacePreferences();
            this.currentWorkspace =
                this.workspaces.find(
                    (workspace) => workspace.id === this.currentWorkspaceId,
                ) ||
                this.workspaces[0] ||
                null;
        },
        async switchWorkspace(workspaceId) {
            if (this.switching || workspaceId === this.currentWorkspaceId)
                return;

            this.switching = true;
            const tabsStore = useTabsStore();
            tabsStore.saveSession();

            try {
                const workspace = await window.api.switchWorkspace(workspaceId);
                await tabsStore.restoreSession(workspace.id);
                this.currentWorkspace = workspace;
                this.workspaces = await window.api.getWorkspaces();
                this.preferences = await window.api.getWorkspacePreferences();

                useFoldersStore().resetForWorkspace();
                useChatStore().resetAllWorkspaceState();
                window.dispatchEvent(
                    new CustomEvent('lumos-workspace-changed', {
                        detail: workspace,
                    }),
                );
            } finally {
                this.switching = false;
            }
        },
        async createWorkspace(name, icon, color) {
            const workspace = await window.api.createWorkspace(
                name,
                icon,
                color,
            );
            await this.refresh();
            return workspace;
        },
        async renameWorkspace(id, name, icon, color) {
            const workspace = await window.api.renameWorkspace({
                id,
                name,
                icon,
                color,
            });
            await this.refresh();
            return workspace;
        },
        async deleteWorkspace(id) {
            if (id === this.currentWorkspaceId) {
                await this.switchWorkspace('default');
            }
            await window.api.deleteWorkspace(id);
            await this.refresh();
        },
        async setStartupPreferences(preferences) {
            this.preferences =
                await window.api.setWorkspacePreferences(preferences);
        },
    },
});
