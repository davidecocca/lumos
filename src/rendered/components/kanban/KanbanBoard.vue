<template>
    <div
        ref="viewport"
        class="d-flex align-stretch flex-grow-1 flex-shrink-0 ga-4 overflow-x-auto pb-4 w-100"
        @dragover.prevent="overBoard"
        @dragleave="leaveBoard"
        @drop="clearDrag"
        @scroll="refreshDragTarget"
    >
        <div
            v-for="column in board.columns"
            :key="column.id"
            :data-column-id="column.id"
            class="kanban-column rounded-lg pa-2"
            :class="{ 'kanban-column--target': target?.columnId === column.id }"
            @dragover.prevent="overColumn($event, column.id)"
            @dragleave="leaveColumn($event, column.id)"
            @drop.prevent="drop($event, column.id)"
        >
            <div class="d-flex align-center ga-2 mb-3 px-1">
                <v-chip
                    :color="PROGRESS_TYPE_COLORS[column.progressType]"
                    :prepend-icon="PROGRESS_TYPE_ICONS[column.progressType]"
                    size="small"
                    variant="tonal"
                    rounded="lg"
                    class="font-weight-medium flex-shrink-1 overflow-hidden"
                >
                    <span class="text-truncate">{{ column.name }}</span>
                </v-chip>
                <span class="text-body-small text-disabled flex-shrink-0">{{
                    filtered
                        ? `${cardsFor(column.id).length}/${totalCounts.get(column.id) || 0}`
                        : cardsFor(column.id).length
                }}</span>
                <v-spacer />
                <v-btn
                    icon="ph-plus"
                    size="x-small"
                    variant="text"
                    density="comfortable"
                    rounded="lg"
                    class="flex-shrink-0 text-medium-emphasis"
                    :disabled="disabled"
                    :aria-label="`Add card to ${column.name}`"
                    @click="emit('add-card', column.id)"
                />
            </div>
            <div class="kanban-column__cards">
                <KanbanCard
                    v-for="(card, index) in cardsFor(column.id)"
                    :key="card.id"
                    :card="card"
                    :columns="board.columns"
                    :today="today"
                    :disabled="disabled"
                    :can-move-up="index > 0"
                    :can-move-down="index < cardsFor(column.id).length - 1"
                    :class="{
                        'kanban-card--target': target?.beforeId === card.id,
                        'opacity-50': draggedId === card.id,
                    }"
                    @edit="emit('edit-card', card)"
                    @duplicate="emit('duplicate-card', card)"
                    @move="moveWithinColumn(card, index, $event)"
                    @delete="emit('delete-card', card)"
                    @dragstart="startDrag($event, card.id)"
                    @dragend="clearDrag"
                />
                <v-btn
                    block
                    variant="tonal"
                    rounded="lg"
                    prepend-icon="ph-plus"
                    class="justify-start text-medium-emphasis"
                    :disabled="disabled"
                    @click="emit('add-card', column.id)"
                    >New card</v-btn
                >
            </div>
        </div>
        <div
            v-if="endSpace"
            class="flex-shrink-0"
            :style="{ width: `${endSpace}px` }"
        />
    </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { toLocalDateString } from './utils/dates.js';
import {
    PROGRESS_TYPE_COLORS,
    PROGRESS_TYPE_ICONS,
} from './utils/constants.js';
import KanbanCard from './KanbanCard.vue';

const props = defineProps({
    board: { type: Object, required: true },
    cards: { type: Array, default: null },
    filtered: Boolean,
    today: { type: String, default: () => toLocalDateString() },
    disabled: Boolean,
    endSpace: { type: Number, default: 0 },
});
const emit = defineEmits([
    'add-card',
    'edit-card',
    'move-card',
    'duplicate-card',
    'delete-card',
]);
const draggedId = ref(null);
const target = ref(null);
const viewport = ref(null);
let dragPoint = null;
let scrollFrame = 0;
let lastScrollTime = 0;
const SCROLL_EDGE = 48;
const SCROLL_SPEED = 600;
const visibleCards = computed(() => props.cards ?? props.board.cards);
const columnCards = computed(() => {
    const groups = new Map();
    for (const card of visibleCards.value) {
        if (!groups.has(card.columnId)) groups.set(card.columnId, []);
        groups.get(card.columnId).push(card);
    }
    return groups;
});
const totalCounts = computed(() => {
    const counts = new Map();
    for (const card of props.board.cards)
        counts.set(card.columnId, (counts.get(card.columnId) || 0) + 1);
    return counts;
});
const cardsFor = (columnId) => columnCards.value.get(columnId) || [];

function moveWithinColumn(card, index, direction) {
    const cards = cardsFor(card.columnId);
    emit('move-card', {
        cardId: card.id,
        columnId: card.columnId,
        beforeId:
            direction < 0
                ? cards[index - 1].id
                : (cards[index + 2]?.id ?? null),
    });
}

function startDrag(event, id) {
    if (props.disabled) {
        event.preventDefault();
        return;
    }
    draggedId.value = id;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.dropEffect = 'move';
    event.dataTransfer.setData('text/plain', id);
}
function overColumn(event, columnId) {
    if (!draggedId.value || props.disabled) return;
    event.dataTransfer.dropEffect = 'move';
    updateTarget(event.currentTarget, columnId, event.clientY);
}
function updateTarget(column, columnId, clientY) {
    const candidates = cardsFor(columnId).filter(
        (card) => card.id !== draggedId.value,
    );
    const elements = column.querySelectorAll('[data-card-id]');
    const beforeElement = [...elements].find((element) => {
        if (element.dataset.cardId === String(draggedId.value)) return false;
        const rect = element.getBoundingClientRect();
        return clientY < rect.top + rect.height / 2;
    });
    const beforeId =
        candidates.find(
            (card) => String(card.id) === beforeElement?.dataset.cardId,
        )?.id ?? null;
    if (
        target.value?.columnId !== columnId ||
        target.value?.beforeId !== beforeId
    )
        target.value = { columnId, beforeId };
}
function overBoard(event) {
    if (!draggedId.value || props.disabled) return;
    event.dataTransfer.dropEffect = 'move';
    dragPoint = { x: event.clientX, y: event.clientY };
    refreshDragTarget();
    if (!scrollFrame) scrollFrame = requestAnimationFrame(scrollBoard);
}
function refreshDragTarget() {
    if (!draggedId.value || !dragPoint || !viewport.value || props.disabled)
        return;
    const column = [
        ...viewport.value.querySelectorAll('[data-column-id]'),
    ].find((element) => {
        const rect = element.getBoundingClientRect();
        return (
            dragPoint.x >= rect.left &&
            dragPoint.x < rect.right &&
            dragPoint.y >= rect.top &&
            dragPoint.y < rect.bottom
        );
    });
    if (column)
        updateTarget(column, Number(column.dataset.columnId), dragPoint.y);
    else target.value = null;
}
function scrollBoard(time) {
    scrollFrame = 0;
    const element = viewport.value;
    if (!draggedId.value || !dragPoint || !element || props.disabled) {
        stopScrolling();
        return;
    }
    const rect = element.getBoundingClientRect();
    const right = Math.max(rect.left, rect.right - (props.endSpace || 0));
    const edge = Math.min(SCROLL_EDGE, (right - rect.left) / 3);
    let speed = 0;
    if (dragPoint.x >= rect.left && dragPoint.x < rect.left + edge)
        speed = -SCROLL_SPEED * (1 - (dragPoint.x - rect.left) / edge);
    else if (dragPoint.x <= right && dragPoint.x > right - edge)
        speed = SCROLL_SPEED * (1 - (right - dragPoint.x) / edge);
    const previous = element.scrollLeft;
    const elapsed = lastScrollTime ? Math.min(time - lastScrollTime, 32) : 16;
    element.scrollLeft = Math.max(
        0,
        Math.min(
            element.scrollWidth - element.clientWidth,
            previous + (speed * elapsed) / 1000,
        ),
    );
    if (!speed || element.scrollLeft === previous) {
        stopScrolling();
        return;
    }
    lastScrollTime = time;
    refreshDragTarget();
    scrollFrame = requestAnimationFrame(scrollBoard);
}
function stopScrolling() {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = lastScrollTime = 0;
}
function leaveBoard(event) {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (
        event.clientX >= rect.left &&
        event.clientX < rect.right &&
        event.clientY >= rect.top &&
        event.clientY < rect.bottom
    )
        return;
    stopScrolling();
    dragPoint = null;
    target.value = null;
}
function leaveColumn(event, columnId) {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (
        event.clientX >= rect.left &&
        event.clientX < rect.right &&
        event.clientY >= rect.top &&
        event.clientY < rect.bottom
    )
        return;
    if (target.value?.columnId === columnId) target.value = null;
}
function drop(event, columnId) {
    if (draggedId.value && !props.disabled) {
        overColumn(event, columnId);
        emit('move-card', {
            cardId: draggedId.value,
            columnId,
            beforeId: target.value?.beforeId ?? null,
        });
    }
    clearDrag();
}
function clearDrag() {
    stopScrolling();
    dragPoint = null;
    draggedId.value = null;
    target.value = null;
}
watch(visibleCards, clearDrag);
watch(() => props.disabled, clearDrag);
onBeforeUnmount(clearDrag);
</script>

<style scoped>
/* Exact flexible column sizing and dashed drop outlines have no Vuetify equivalent. */
.kanban-column {
    flex: 1 0 250px;
    min-width: 250px;
    border: 1px solid transparent;
}
.kanban-column--target,
.kanban-card--target {
    background: rgba(15, 23, 42, 0.06);
    outline: 2px dashed rgba(15, 23, 42, 0.2);
    outline-offset: -2px;
}
.v-theme--dark .kanban-column--target,
.v-theme--dark .kanban-card--target {
    background: rgba(255, 255, 255, 0.08);
    outline-color: rgba(255, 255, 255, 0.2);
}
.kanban-column__cards {
    min-height: 72px;
}
</style>
