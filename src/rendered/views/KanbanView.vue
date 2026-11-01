<template>
    <div>
        <div
            class="d-flex justify-end align-center flex-wrap ga-3 mb-4"
            style="min-height: 48px"
        >
            <v-tabs align-tabs="start" color="primary" class="flex-grow-1">
                <v-tab value="boards" prepend-icon="ph-squares-four">
                    Boards
                    <v-progress-circular
                        v-if="loading"
                        indeterminate
                        :size="14"
                        :width="2"
                        color="primary"
                        class="ms-2 text-medium-emphasis"
                        aria-label="Loading boards"
                    />
                </v-tab>
            </v-tabs>
            <v-btn
                color="primary"
                variant="tonal"
                prepend-icon="ph-plus"
                rounded="lg"
                :disabled="disabled"
                @click="openCreateBoard"
                >New board</v-btn
            >
        </div>
        <v-alert
            v-if="error"
            type="error"
            variant="tonal"
            rounded="lg"
            density="compact"
            closable
            class="mb-4"
            role="alert"
            @click:close="error = ''"
            >{{ error }}</v-alert
        >
        <v-row
            v-if="loading"
            density="comfortable"
            role="status"
            aria-label="Loading boards"
        >
            <v-col v-for="card in 3" :key="card" cols="12" md="6" lg="4">
                <v-card
                    class="border pa-4 d-flex flex-column"
                    elevation="0"
                    height="108"
                    rounded="lg"
                >
                    <div class="d-flex align-center justify-space-between ga-2">
                        <v-skeleton-loader
                            type="heading"
                            width="220"
                            max-width="70%"
                            class="ma-n4"
                            color="transparent"
                            aria-hidden="true"
                        />
                        <v-skeleton-loader
                            type="heading"
                            width="56"
                            class="ma-n4 flex-shrink-0"
                            color="transparent"
                            aria-hidden="true"
                        />
                    </div>
                    <div
                        class="d-flex align-center justify-space-between ga-2 mt-auto"
                    >
                        <v-skeleton-loader
                            type="text"
                            width="112"
                            max-width="40%"
                            class="ma-n4"
                            color="transparent"
                            aria-hidden="true"
                        />
                        <v-skeleton-loader
                            type="text"
                            width="160"
                            max-width="50%"
                            class="ma-n4"
                            color="transparent"
                            aria-hidden="true"
                        />
                    </div>
                </v-card>
            </v-col>
        </v-row>
        <div v-else-if="!boards.length" class="d-flex justify-center">
            <EmptyState
                title="Your ideas, in motion"
                text="Create a board to turn ideas into action."
                icon="ph-sneaker-move"
            />
        </div>
        <v-row v-else density="comfortable">
            <v-col
                v-for="item in boards"
                :key="item.id"
                cols="12"
                md="6"
                lg="4"
            >
                <KanbanBoardSummaryCard
                    :board="item"
                    :disabled="disabled"
                    :updated-at="toRelativeTime(item.updated_at, now)"
                    @rename="openRenameBoard(item)"
                    @duplicate="duplicateBoard(item)"
                    @delete="openBoardDelete(item)"
                />
            </v-col>
        </v-row>
        <CreateBoardDialog
            v-model="createBoardDialog"
            v-model:name="nameDraft"
            :busy="busy"
            :disabled="disabled"
            :error="dialogError"
            @create="createBoard"
        />
        <RenameBoardDialog
            v-model="renameBoardDialog"
            v-model:name="nameDraft"
            :busy="busy"
            :disabled="disabled"
            :error="dialogError"
            @save="renameBoard"
        />
        <ConfirmDeleteBoardDialog
            v-model="boardDeleteDialog"
            :busy="busy"
            :disabled="disabled"
            :error="dialogError"
            @delete="deleteBoard"
        />
    </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useWorkspaceStore } from '../stores/workspaceStore';

import EmptyState from '../components/commons/EmptyState.vue';
import KanbanBoardSummaryCard from '../components/kanban/KanbanBoardSummaryCard.vue';
import CreateBoardDialog from '../components/kanban/dialogs/CreateBoardDialog.vue';
import RenameBoardDialog from '../components/kanban/dialogs/RenameBoardDialog.vue';
import ConfirmDeleteBoardDialog from '../components/kanban/dialogs/ConfirmDeleteBoardDialog.vue';
import { useKanbanBoardData } from '../components/kanban/composables/useKanbanBoardData.js';
import { toRelativeTime } from '../components/kanban/utils/dates.js';

const { api } = window;
const route = useRoute();
const router = useRouter();
const workspaceStore = useWorkspaceStore();
const now = ref(Date.now());
const createBoardDialog = ref(false);
const renameBoardDialog = ref(false);
const nameDraft = ref('');
const actionBoard = ref(null);
const boardDeleteDialog = ref(false);

const { boards, loading, busy, disabled, error, dialogError, load, mutate } =
    useKanbanBoardData({
        api,
        route,
        workspaceStore,
        reset() {
            createBoardDialog.value =
                renameBoardDialog.value =
                boardDeleteDialog.value =
                    false;
            actionBoard.value = null;
        },
        hasDialog: () =>
            createBoardDialog.value ||
            renameBoardDialog.value ||
            boardDeleteDialog.value,
    });

function openCreateBoard() {
    actionBoard.value = null;
    nameDraft.value = '';
    dialogError.value = '';
    createBoardDialog.value = true;
}

function openRenameBoard(item) {
    actionBoard.value = item;
    nameDraft.value = item.name;
    dialogError.value = '';
    renameBoardDialog.value = true;
}

function renameBoard() {
    if (!nameDraft.value.trim()) return;

    const workspaceId = workspaceStore.currentWorkspaceId;
    const id = actionBoard.value.id;
    const name = nameDraft.value;
    return mutate(
        () => api.renameKanbanBoard({ id, workspaceId, name }),
        async () => {
            renameBoardDialog.value = false;
            await load();
        },
    );
}

function createBoard() {
    if (!nameDraft.value.trim()) return;

    return mutate(
        () =>
            api.createKanbanBoard({
                workspaceId: workspaceStore.currentWorkspaceId,
                name: nameDraft.value,
            }),
        async (result) => {
            createBoardDialog.value = false;
            await router.push({
                name: 'kanban-board',
                params: { boardId: result.id },
            });
        },
    );
}

function openBoardDelete(item) {
    actionBoard.value = item;
    dialogError.value = '';
    boardDeleteDialog.value = true;
}

function duplicateBoard(item) {
    const workspaceId = workspaceStore.currentWorkspaceId;
    return mutate(
        () => api.duplicateKanbanBoard({ workspaceId, id: item.id }),
        load,
    );
}

function deleteBoard() {
    const workspaceId = workspaceStore.currentWorkspaceId;
    const id = actionBoard.value.id;
    return mutate(
        () => api.deleteKanbanBoard({ workspaceId, id }),
        async () => {
            boardDeleteDialog.value = false;
            await load();
        },
    );
}

watch(() => workspaceStore.currentWorkspaceId, load, { immediate: true });
let dateTimer;
const refreshNow = () => {
    now.value = Date.now();
};
onMounted(() => {
    dateTimer = window.setInterval(refreshNow, 60000);
    window.addEventListener('focus', refreshNow);
});
onBeforeUnmount(() => {
    window.clearInterval(dateTimer);
    window.removeEventListener('focus', refreshNow);
});
</script>
