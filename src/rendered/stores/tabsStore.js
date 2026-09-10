import { defineStore } from 'pinia';

const SESSION_STORAGE_KEY = 'lumosTabSession';
const RESTORE_STORAGE_KEY = 'lumosRestoreOpenTabs';

export const useTabsStore = defineStore('tabs', {
    state: () => ({
        tabs: [],
        activeNoteId: null,
        restoreOpenTabsOnStartup: true,
    }),
    actions: {
        async restoreSession() {
            try {
                this.restoreOpenTabsOnStartup =
                    localStorage.getItem(RESTORE_STORAGE_KEY) !== 'false';
                if (!this.restoreOpenTabsOnStartup) return;

                const session = JSON.parse(
                    localStorage.getItem(SESSION_STORAGE_KEY) || 'null',
                );
                if (!Array.isArray(session?.noteIds)) return;

                const noteIds = [...new Set(session.noteIds)].filter(
                    (id) => Number.isSafeInteger(id) && id > 0,
                );
                if (!noteIds.length) return;

                const notes = await window.api.getNotesByIds(noteIds);
                // Do not replace tabs opened while the lookup was pending.
                if (this.tabs.length || !this.restoreOpenTabsOnStartup) return;

                const notesById = new Map(notes.map((note) => [note.id, note]));
                const tabs = noteIds
                    .filter((id) => notesById.has(id))
                    .map((id) => this.toTab(notesById.get(id)));
                const activeNoteId =
                    session.activeNoteId === null
                        ? null
                        : (tabs.find((tab) => tab.id === session.activeNoteId)
                              ?.id ??
                          tabs[0]?.id ??
                          null);

                this.$patch({ tabs, activeNoteId });
            } catch (error) {
                console.warn('Could not restore the tab session:', error);
            }
        },
        saveSession() {
            try {
                localStorage.setItem(
                    SESSION_STORAGE_KEY,
                    JSON.stringify({
                        noteIds: this.tabs.map((tab) => tab.id),
                        activeNoteId: this.activeNoteId,
                    }),
                );
            } catch (error) {
                console.warn('Could not save the tab session:', error);
            }
        },
        setRestoreOpenTabsOnStartup(enabled) {
            this.restoreOpenTabsOnStartup = enabled;
            try {
                localStorage.setItem(RESTORE_STORAGE_KEY, String(enabled));
            } catch (error) {
                console.warn(
                    'Could not save the tab restore preference:',
                    error,
                );
            }
        },
        openNote(note) {
            const existingTab = this.tabs.find((tab) => tab.id === note.id);

            if (existingTab) {
                Object.assign(existingTab, this.toTab(note));
            } else {
                this.tabs.push(this.toTab(note));
            }

            this.activeNoteId = note.id;
        },
        activateNote(noteId) {
            if (this.tabs.some((tab) => tab.id === noteId)) {
                this.activeNoteId = noteId;
            }
        },
        moveTab(noteId, targetId, after = false) {
            const from = this.tabs.findIndex((tab) => tab.id === noteId);
            if (
                from === -1 ||
                noteId === targetId ||
                !this.tabs.some((tab) => tab.id === targetId)
            )
                return;

            const [tab] = this.tabs.splice(from, 1);
            const target = this.tabs.findIndex((tab) => tab.id === targetId);
            this.tabs.splice(target + (after ? 1 : 0), 0, tab);
        },
        closeNote(noteId) {
            const tabIndex = this.tabs.findIndex((tab) => tab.id === noteId);
            if (tabIndex === -1) return this.activeNoteId;

            const wasActive = this.activeNoteId === noteId;
            this.tabs.splice(tabIndex, 1);

            if (wasActive) {
                this.activeNoteId =
                    this.tabs[tabIndex]?.id ??
                    this.tabs[tabIndex - 1]?.id ??
                    null;
            }

            return this.activeNoteId;
        },
        closeNotes(noteIds) {
            const deletedIds = new Set(noteIds);
            const activeTabIndex = this.tabs.findIndex(
                (tab) => tab.id === this.activeNoteId,
            );
            const activeWasDeleted = deletedIds.has(this.activeNoteId);

            this.tabs = this.tabs.filter((tab) => !deletedIds.has(tab.id));

            if (activeWasDeleted) {
                this.activeNoteId =
                    this.tabs[Math.min(activeTabIndex, this.tabs.length - 1)]
                        ?.id ?? null;
            }
        },
        updateNote(noteId, updates) {
            const tab = this.tabs.find((item) => item.id === noteId);
            if (tab) Object.assign(tab, updates);
        },
        toTab(note) {
            return {
                id: note.id,
                title: note.title,
            };
        },
    },
});
