// Loads boards and tag/note options, handles persistence, and tracks loading, busy, and error states.
import { computed, onBeforeUnmount, ref } from 'vue';

export function useKanbanBoardData({
    api,
    route,
    workspaceStore,
    reset,
    hasDialog,
}) {
    const boards = ref([]);
    const board = ref(null);
    const tagOptions = ref([]); // existing tag names used by cards in the current workspace, offered as suggestions when adding tags
    const noteOptions = ref([]);    // notes available in the current workspace, used by the Link notes dialog and to display linked-note titles
    const loading = ref(false);
    const busy = ref(false);
    const disabled = computed(
        () => loading.value || busy.value || workspaceStore.switching,
    );
    const error = ref('');
    const dialogError = ref('');
    let generation = 0;

    // Load the current board and tag/note options, or the list of boards if no board is selected.
    async function load() {
        const current = ++generation;
        const workspaceId = workspaceStore.currentWorkspaceId;
        board.value = null;
        boards.value = [];
        tagOptions.value = [];
        noteOptions.value = [];
        reset();
        error.value = dialogError.value = '';
        loading.value = true;
        try {
            if (workspaceId == null) return;
            if (route.params.boardId) {
                const [result, options] = await Promise.all([
                    api.getKanbanBoard({
                        workspaceId,
                        id: Number(route.params.boardId),
                    }),
                    api.getKanbanOptions({ workspaceId }),
                ]);
                if (current === generation) {
                    board.value = result;
                    tagOptions.value = options.tags;
                    noteOptions.value = options.notes;
                }
            } else {
                const result = await api.listKanbanBoards({ workspaceId });
                if (current === generation) boards.value = result;
            }
        } catch (cause) {
            if (current === generation) error.value = cause.message;
        } finally {
            if (current === generation) loading.value = false;
        }
    }

    // Shared wrapper for operations that change Kanban data.
    // Handles busy/errors, ignores stale results, and calls onSuccess; returns true on success, false otherwise.
    async function mutate(operation, onSuccess) {
        if (disabled.value)
            return false;

        const current = generation;
        busy.value = true;
        error.value = dialogError.value = '';
        try {
            const result = await operation();
            if (current !== generation)
                return false;

            await onSuccess(result);
            return true;
        } catch (cause) {
            if (current === generation) {
                if (hasDialog()) dialogError.value = cause.message;
                else error.value = cause.message;
            }
            return false;
        } finally {
            busy.value = false;
        }
    }

    function persist(changes, onSuccess = () => {}) {
        const payload = {
            id: board.value.id,
            ...changes,
            workspaceId: board.value.workspace_id,
        };
        const save = changes.card
            ? api.saveKanbanCard
            : changes.move
              ? api.moveKanbanCard
              : changes.deleteCardId
                ? api.deleteKanbanCard
                : changes.columns
                  ? api.saveKanbanColumns
                  : api.renameKanbanBoard;
        if (changes.move) {
            Object.assign(payload, changes.move);
            delete payload.move;
        }
        if (changes.deleteCardId) {
            payload.cardId = changes.deleteCardId;
            delete payload.deleteCardId;
        }
        // Only the affected entity crosses IPC; clone to remove Vue reactive proxies.
        return mutate(
            () => save(JSON.parse(JSON.stringify(payload))),
            async (result) => {
                board.value = result;
                await onSuccess(result);
                const options = await api.getKanbanOptions({
                    workspaceId: payload.workspaceId,
                });
                if (workspaceStore.currentWorkspaceId === payload.workspaceId)
                    tagOptions.value = options.tags;
            },
        );
    }

    onBeforeUnmount(() => {
        generation++;
    });
    return {
        boards,
        board,
        tagOptions,
        noteOptions,
        loading,
        busy,
        disabled,
        error,
        dialogError,
        load,
        mutate,
        persist,
    };
}
