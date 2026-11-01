<template>
    <div class="d-flex flex-column" style="min-height: 100%">
        <v-alert
            v-if="error"
            type="error"
            variant="tonal"
            rounded="lg"
            density="comfortable"
            closable
            class="mb-4 flex-grow-0"
            @click:close="error = ''"
            >{{ error }}</v-alert
        >

        <!-- Loading skeletons -->
        <div
            v-if="loading"
            class="d-flex flex-column flex-grow-1"
            role="status"
        >
            <div
                class="d-flex align-center flex-wrap ga-3 mb-4"
                style="min-height: 48px"
                aria-hidden="true"
            >
                <div class="d-flex align-center ga-2 flex-grow-1">
                    <v-skeleton-loader
                        type="heading"
                        width="64"
                        class="ma-n4 flex-shrink-0"
                        color="transparent"
                    />
                    <v-skeleton-loader
                        type="heading"
                        width="252"
                        max-width="70%"
                        class="ma-n4"
                        color="transparent"
                    />
                </div>
                <v-spacer />
                <div class="d-flex align-center flex-shrink-0 ga-3">
                    <v-skeleton-loader
                        type="heading"
                        width="64"
                        class="ma-n4"
                        color="transparent"
                    />
                    <v-skeleton-loader
                        type="heading"
                        width="160"
                        class="ma-n4"
                        color="transparent"
                    />
                    <v-skeleton-loader
                        type="heading"
                        width="144"
                        class="ma-n4"
                        color="transparent"
                    />
                </div>
            </div>
            <div class="d-flex align-center ga-3 mb-4" aria-hidden="true">
                <v-sheet
                    border
                    rounded="lg"
                    color="transparent"
                    height="40"
                    max-width="440"
                    class="d-flex align-center flex-grow-1 overflow-hidden"
                    style="min-width: 0"
                >
                    <v-skeleton-loader
                        type="text"
                        width="240"
                        max-width="100%"
                        class="my-n4"
                        color="transparent"
                    />
                </v-sheet>
                <v-skeleton-loader
                    type="heading"
                    width="128"
                    class="ma-n4 flex-shrink-0"
                    color="transparent"
                />
            </div>
            <div
                class="d-flex ga-4 overflow-x-auto pb-4 flex-grow-1 flex-shrink-0 w-100"
                aria-hidden="true"
            >
                <v-sheet
                    v-for="column in 5"
                    :key="column"
                    color="transparent"
                    rounded="lg"
                    class="pa-2 flex-grow-1 flex-shrink-0"
                    width="250"
                >
                    <div
                        class="d-flex align-center ga-2 mb-3 px-1"
                        style="min-height: 28px"
                    >
                        <v-skeleton-loader
                            type="heading"
                            width="144"
                            class="ma-n4"
                            color="transparent"
                        />
                        <v-skeleton-loader
                            type="text"
                            width="48"
                            class="ma-n4"
                            color="transparent"
                        />
                        <v-spacer />
                        <v-skeleton-loader
                            type="heading"
                            width="56"
                            class="ma-n4 flex-shrink-0"
                            color="transparent"
                        />
                    </div>
                    <v-card
                        v-for="card in 2"
                        :key="card"
                        elevation="0"
                        rounded="lg"
                        class="border pa-1 mb-2"
                    >
                        <div
                            class="d-flex align-center ga-2 pa-3"
                            style="min-height: 56px"
                        >
                            <v-skeleton-loader
                                type="text"
                                width="200"
                                max-width="80%"
                                class="ma-n4"
                                color="transparent"
                            />
                            <v-spacer />
                            <v-skeleton-loader
                                type="text"
                                width="48"
                                class="ma-n4 flex-shrink-0"
                                color="transparent"
                            />
                        </div>
                        <div class="px-3 pb-3">
                            <v-skeleton-loader
                                type="text, text"
                                class="ma-n4"
                                color="transparent"
                            />
                        </div>
                    </v-card>
                </v-sheet>
            </div>
        </div>

        <!-- Board content -->
        <template v-else-if="board">
            <div
                class="d-flex align-center flex-wrap ga-3 mb-4"
                style="min-height: 48px"
            >
                <div class="d-flex align-center ga-2">
                    <v-btn
                        v-tooltip:bottom="'All boards'"
                        icon="ph-arrow-left"
                        variant="plain"
                        size="small"
                        density="comfortable"
                        rounded="lg"
                        class="flex-shrink-0"
                        :disabled="busy"
                        :to="{ name: 'kanban' }"
                        aria-label="All boards"
                    />
                    <h1
                        class="text-title-large font-weight-medium text-break ma-0"
                    >
                        {{ board.name }}
                    </h1>
                    <v-progress-circular
                        v-if="busy"
                        v-tooltip:bottom="'Saving...'"
                        indeterminate
                        :size="14"
                        :width="2"
                        class="text-medium-emphasis flex-shrink-0"
                        role="status"
                        aria-label="Saving board"
                    />
                </div>
                <v-spacer />
                <v-menu>
                    <template #activator="{ props }">
                        <v-btn
                            v-bind="props"
                            icon="ph-dots-three"
                            variant="text"
                            density="comfortable"
                            rounded="lg"
                            :disabled="disabled"
                            aria-label="Board actions"
                        />
                    </template>
                    <v-list density="compact" rounded="lg" class="px-1 py-2">
                        <v-list-item
                            v-for="item in boardMenuItems"
                            :key="item.key"
                            :title="item.title"
                            :append-icon="item.icon"
                            :base-color="item.baseColor"
                            rounded="lg"
                            @click="item.action"
                        />
                    </v-list>
                </v-menu>
                <v-btn
                    variant="text"
                    prepend-icon="ph-columns"
                    rounded="lg"
                    :disabled="disabled"
                    @click="openColumns"
                    >Edit columns</v-btn
                >
                <v-btn
                    color="primary"
                    variant="tonal"
                    prepend-icon="ph-plus"
                    rounded="lg"
                    :disabled="disabled"
                    @click="openCard(null, board.columns[0].id)"
                    >New card</v-btn
                >
            </div>
            <KanbanFilters
                v-model="filters"
                :tags="tagOptions"
                :active="filtersActive"
                @clear="clearFilters"
            />
            <!-- No results message -->
            <div
                v-if="filtersActive && !visibleCards.length"
                class="d-flex align-center ga-3 text-medium-emphasis mb-3 ml-3"
                role="status"
            >
                <v-icon icon="ph-binoculars" size="20" />
                <span>No results</span>
            </div>

            <!-- Board -->
            <KanbanBoard
                :board="board"
                :end-space="cardPanel ? cardPanelWidth : 0"
                :cards="visibleCards"
                :filtered="filtersActive"
                :today="today"
                :disabled="disabled"
                @add-card="openCard(null, $event)"
                @edit-card="openCard($event)"
                @move-card="onMoveCard"
                @duplicate-card="duplicateCard"
                @delete-card="openCardDelete"
            />
        </template>
        <!-- Board unavailable state -->
        <template v-else>
            <div class="d-flex">
                <v-btn
                    variant="text"
                    rounded="lg"
                    prepend-icon="ph-arrow-left"
                    :disabled="busy"
                    :to="{ name: 'kanban' }"
                    >All boards</v-btn
                >
            </div>
            <div class="d-flex justify-center">
                <v-empty-state
                    title="Board unavailable"
                    width="400"
                    max-width="100%"
                    class="text-center"
                >
                    <template #media>
                        <v-avatar size="48" variant="text">
                            <v-icon icon="ph-squares-four" size="32" />
                        </v-avatar>
                    </template>
                    <template #actions>
                        <v-btn
                            variant="text"
                            rounded="lg"
                            prepend-icon="ph-arrow-clockwise"
                            :disabled="busy"
                            @click="load"
                            >Retry</v-btn
                        >
                    </template>
                </v-empty-state>
            </div>
        </template>
        <RenameBoardDialog
            v-model="nameDialog"
            v-model:name="nameDraft"
            :busy="busy"
            :disabled="disabled"
            :error="dialogError"
            @save="saveName"
        />
        <KanbanCardPanel
            :model-value="cardPanel"
            :card="cardDraft"
            :columns="board?.columns || []"
            :tags="tagOptions"
            :notes="noteOptions"
            :folders="foldersStore.folders"
            :disabled="
                loading || workspaceStore.switching || (busy && !cardSaving)
            "
            :busy="busy"
            :error="dialogError"
            :can-move-up="panelCardIndex > 0"
            :can-move-down="
                panelCardIndex >= 0 &&
                panelCardIndex < panelColumnCards.length - 1
            "
            @update:model-value="setCardPanel"
            @update:width="cardPanelWidth = $event"
            @delete="openCardDelete(cardDraft)"
            @duplicate="duplicatePanelCard"
            @move="movePanelCard"
            @open-note="openLinkedNote"
        />
        <EditColumnsDialog
            v-model="columnsDialog"
            v-model:columns="columnsDraft"
            :cards="board?.cards || []"
            :busy="busy"
            :disabled="disabled"
            :error="dialogError"
            @save="saveColumns"
        />
        <ConfirmDeleteBoardDialog
            v-model="boardDeleteDialog"
            :busy="busy"
            :disabled="disabled"
            :error="dialogError"
            @delete="deleteBoard"
        />
        <ConfirmDeleteCardDialog
            v-model="cardDeleteDialog"
            :busy="busy"
            :disabled="disabled"
            :error="dialogError"
            @delete="deleteCard"
        />
    </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useWorkspaceStore } from '../stores/workspaceStore';
import { useFoldersStore } from '../stores/foldersStore';
import KanbanBoard from '../components/kanban/KanbanBoard.vue';
import KanbanCardPanel from '../components/kanban/KanbanCardPanel.vue';
import KanbanFilters from '../components/kanban/KanbanFilters.vue';
import RenameBoardDialog from '../components/kanban/dialogs/RenameBoardDialog.vue';
import EditColumnsDialog from '../components/kanban/dialogs/EditColumnsDialog.vue';
import ConfirmDeleteBoardDialog from '../components/kanban/dialogs/ConfirmDeleteBoardDialog.vue';
import ConfirmDeleteCardDialog from '../components/kanban/dialogs/ConfirmDeleteCardDialog.vue';
import { useKanbanBoardData } from '../components/kanban/composables/useKanbanBoardData.js';
import { useKanbanCardDraft } from '../components/kanban/composables/useKanbanCardDraft.js';
import { useKanbanCardActions } from '../components/kanban/composables/useKanbanCardActions.js';
import { filterCards } from '../components/kanban/utils/filters.js';
import { toLocalDateString } from '../components/kanban/utils/dates.js';

const { api } = window;
const route = useRoute();
const router = useRouter();
const workspaceStore = useWorkspaceStore();
const foldersStore = useFoldersStore();
const today = ref(toLocalDateString());
const emptyFilters = () => ({
    query: '',
    priority: null,
    tags: [],
    due: 'all',
});
const filters = ref(emptyFilters());
const filtersActive = computed(() =>
    Boolean(
        filters.value.query?.trim() ||
        filters.value.priority ||
        filters.value.tags?.length ||
        filters.value.due !== 'all',
    ),
);
const clearFilters = () => {
    filters.value = emptyFilters();
};
const nameDialog = ref(false);
const nameDraft = ref('');
const columnsDialog = ref(false);
const columnsDraft = ref([]);
const boardDeleteDialog = ref(false);
const cardDeleteDialog = ref(false);
const cardPanelWidth = ref(480);
const boardMenuItems = [
    {
        key: 'rename',
        title: 'Rename board',
        icon: 'ph-pencil-simple',
        action: openNameDialog,
    },
    {
        key: 'delete',
        title: 'Delete board',
        icon: 'ph-trash',
        baseColor: 'error',
        action: () => {
            boardDeleteDialog.value = true;
        },
    },
];

const {
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
} = useKanbanBoardData({
    api,
    route,
    workspaceStore,
    reset() {
        clearFilters();
        resetCardPanel();
        nameDialog.value = columnsDialog.value = false;
        boardDeleteDialog.value = cardDeleteDialog.value = false;
        deleteCardId.value = null;
    },
    hasDialog: () =>
        Boolean(
            nameDialog.value ||
            cardPanel.value ||
            columnsDialog.value ||
            boardDeleteDialog.value ||
            cardDeleteDialog.value,
        ),
});
const draft = useKanbanCardDraft({
    board,
    disabled,
    busy,
    persist,
    dialogError,
});
const {
    cardDraft,
    cardPanel,
    cardSaving,
    panelColumnCards,
    panelCardIndex,
    openCard,
    saveCard,
    setCardPanel,
    resetCardPanel,
} = draft;
const {
    deleteCardId,
    onMoveCard,
    duplicateCard,
    duplicatePanelCard,
    movePanelCard,
    openCardDelete,
    deleteCard,
} = useKanbanCardActions({
    board,
    noteOptions,
    persist,
    draft,
    cardDeleteDialog,
    dialogError,
});
const visibleCards = computed(() =>
    board.value ? filterCards(board.value, filters.value, today.value) : [],
);

function openNameDialog() {
    nameDraft.value = board.value.name;
    dialogError.value = '';
    nameDialog.value = true;
}

function saveName() {
    if (!nameDraft.value.trim()) return;
    return persist({ name: nameDraft.value }, () => {
        nameDialog.value = false;
    });
}

async function openLinkedNote(noteId) {
    if (!noteOptions.value.some((note) => note.id === noteId)) return;
    const workspaceId = workspaceStore.currentWorkspaceId;
    if (
        (await saveCard({ close: true })) &&
        workspaceId === workspaceStore.currentWorkspaceId &&
        !workspaceStore.switching
    )
        await foldersStore.openNote(noteId, router);
}

function openColumns() {
    columnsDraft.value = board.value.columns.map((column) => ({ ...column }));
    dialogError.value = '';
    columnsDialog.value = true;
}
const saveColumns = () =>
    persist({ columns: columnsDraft.value }, () => {
        columnsDialog.value = false;
    });

function deleteBoard() {
    const workspaceId = workspaceStore.currentWorkspaceId;
    const selected = board.value;
    return mutate(
        () =>
            api.deleteKanbanBoard({
                workspaceId,
                id: selected.id,
            }),
        async () => {
            boardDeleteDialog.value = false;
            await router.push({ name: 'kanban' });
        },
    );
}

watch(
    [() => route.params.boardId, () => workspaceStore.currentWorkspaceId],
    load,
    { immediate: true },
);
let dateTimer;
const refreshToday = () => {
    today.value = toLocalDateString();
};
onMounted(() => {
    dateTimer = window.setInterval(refreshToday, 60000);
    window.addEventListener('focus', refreshToday);
});
onBeforeUnmount(() => {
    window.clearInterval(dateTimer);
    window.removeEventListener('focus', refreshToday);
});
</script>
