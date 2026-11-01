<template>
    <v-navigation-drawer
        location="right"
        temporary
        :scrim="false"
        :width="width"
        :model-value="modelValue"
        :class="['kanban-card-panel', { 'no-transition': isResizing }]"
        @update:model-value="!busy && emit('update:modelValue', $event)"
    >
        <!-- Invisible resizer element to allow resizing the drawer without interfering with the card content -->
        <div
            class="kanban-card-panel__resizer position-absolute top-0 bottom-0"
            @mousedown.prevent="startResize"
        />
        <div class="d-flex flex-column fill-height">
            <!-- Header: title, saving status, and actions -->
            <div class="d-flex align-center flex-shrink-0 ga-3 px-5 pt-3 pb-2">
                <div class="kanban-card-panel__title-wrapper">
                    <span
                        class="kanban-card-panel__title-measure"
                        aria-hidden="true"
                    >{{ card.title || 'Untitled card' }}</span>
                    <v-text-field
                        ref="titleField"
                        v-model="card.title"
                        variant="plain"
                        density="comfortable"
                        hide-details
                        single-line
                        maxlength="240"
                        placeholder="Untitled card"
                        class="kanban-card-panel__title"
                        :disabled="disabled"
                        aria-label="Card title"
                    />
                </div>
                <v-progress-circular
                    v-if="busy"
                    v-tooltip:bottom="'Saving...'"
                    indeterminate
                    :size="14"
                    :width="2"
                    class="text-medium-emphasis flex-shrink-0"
                    aria-label="Saving card"
                />
                <v-spacer />
                <div class="d-flex align-center flex-shrink-0 ga-2">
                    <KanbanCardActionsMenu
                        v-if="card.id"
                        location="bottom end"
                        :disabled="disabled"
                        :actions-disabled="
                            disabled || busy || !card.title.trim()
                        "
                        :delete-disabled="disabled || busy"
                        :can-move-up="canMoveUp"
                        :can-move-down="canMoveDown"
                        @duplicate="emit('duplicate')"
                        @move="emit('move', $event)"
                        @delete="emit('delete')"
                    />
                    <v-btn
                        v-tooltip:bottom="'Close'"
                        icon="ph-x"
                        variant="text"
                        rounded="lg"
                        density="comfortable"
                        :disabled="busy"
                        aria-label="Close"
                        @click="emit('update:modelValue', false)"
                    />
                </div>
            </div>
            <!-- Error feedback stays outside the scrollable body. -->
            <div v-if="error" class="flex-shrink-0 px-5 mb-3">
                <v-alert
                    type="error"
                    variant="tonal"
                    rounded="lg"
                    density="compact"
                    role="alert"
                    >{{ error }}</v-alert
                >
            </div>
            <!-- Body: properties and description -->
            <div
                class="kanban-card-panel__body d-flex flex-column flex-grow-1 overflow-y-auto px-5 pb-1"
            >
                <KanbanCardProperties
                    :model-value="card"
                    :columns="columns"
                    :disabled="disabled"
                    class="flex-shrink-0 mb-3"
                />
                <KanbanDescriptionEditor
                    v-model="card.description"
                    :disabled="disabled"
                    fill-space
                    class="kanban-card-panel__editor flex-1-1"
                />
            </div>
            <!-- Footer: linked notes, tags, and timestamps -->
            <div class="flex-shrink-0 px-5 pt-1 pb-3">
                <KanbanLinkedNotesField
                    v-model="card.noteIds"
                    :notes="notes"
                    :folders="folders"
                    :disabled="disabled"
                    :can-open="Boolean(card.title.trim())"
                    class="mt-3 mb-3"
                    @open-note="emit('open-note', $event)"
                />
                <KanbanTagsField
                    v-model="card.tags"
                    :tags="tags"
                    :disabled="disabled"
                />
                <!-- Timestamps (only shown for cards that have been saved to the database) -->
                <div
                    v-if="card.id"
                    class="kanban-card-panel__timestamps d-flex flex-wrap gc-4 justify-end text-body-small text-medium-emphasis mt-3 pt-2 border-t"
                >
                    <span
                        class="text-no-wrap"
                        :title="timestamp(card.createdAt)"
                        >Created
                        {{
                            toRelativeTime(card.createdAt, now, 'Not recorded')
                        }}</span
                    >
                    <span
                        class="text-no-wrap"
                        :title="timestamp(card.updatedAt)"
                        >Updated
                        {{
                            toRelativeTime(card.updatedAt, now, 'Not recorded')
                        }}</span
                    >
                </div>
            </div>
        </div>
    </v-navigation-drawer>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import KanbanCardProperties from './KanbanCardProperties.vue';
import KanbanDescriptionEditor from './KanbanDescriptionEditor.vue';
import KanbanLinkedNotesField from './KanbanLinkedNotesField.vue';
import KanbanTagsField from './KanbanTagsField.vue';
import KanbanCardActionsMenu from './KanbanCardActionsMenu.vue';
import { parseTimestamp } from '../../utils/date.js';
import { toRelativeTime } from './utils/dates.js';

const props = defineProps({
    modelValue: Boolean,
    card: { type: Object, required: true },
    columns: { type: Array, default: () => [] },
    tags: { type: Array, default: () => [] },
    notes: { type: Array, default: () => [] },
    folders: { type: Array, default: () => [] },
    disabled: Boolean,
    busy: Boolean,
    canMoveUp: Boolean,
    canMoveDown: Boolean,
    error: { type: String, default: '' },
});
const emit = defineEmits([
    'update:modelValue',
    'update:width',
    'delete',
    'duplicate',
    'move',
    'open-note',
]);
const now = ref(Date.now());
let dateTimer;
const timestamp = (value) =>
    parseTimestamp(value)?.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }) || 'Not recorded';
const width = ref(
    Math.max(
        360,
        Math.min(760, Number(localStorage.getItem('kanbanPanelWidth')) || 480),
    ),
);
const isResizing = ref(false);
const titleField = ref(null);

watch(
    () => props.modelValue,
    async (open) => {
        if (!open) return;
        await nextTick();
        if (props.modelValue && !isResizing.value) titleField.value?.focus();
    },
    { flush: 'post' },
);

function startResize() {
    isResizing.value = true;
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
}
function resize(event) {
    if (isResizing.value)
        width.value = Math.max(
            360,
            Math.min(760, window.innerWidth - event.clientX),
        );
}
function stopResize() {
    isResizing.value = false;
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResize);
}
watch(width, (value) => localStorage.setItem('kanbanPanelWidth', value));
watch(width, (value) => emit('update:width', value), { immediate: true });
onMounted(() => {
    dateTimer = window.setInterval(() => {
        now.value = Date.now();
    }, 60000);
});
onBeforeUnmount(() => {
    stopResize();
    window.clearInterval(dateTimer);
});
</script>

<style scoped>
/* Scroll/shrink constraints are required inside the drawer's flex layout. */
.kanban-card-panel__body {
    min-height: 0;
}
.kanban-card-panel__editor {
    min-height: 160px;
}
.kanban-card-panel__title {
    min-width: 0;
}
/* Vuetify does not provide a drawer resize handle or plain-input typography props. */
.kanban-card-panel__resizer {
    cursor: col-resize;
    left: -4px;
    width: 8px;
    z-index: 1;
}
/* Measure the title without relying on intrinsic sizing inside Vuetify's input grid. */
.kanban-card-panel__title-wrapper {
    display: grid;
    flex: 0 1 auto;
    min-width: 0;
}
.kanban-card-panel__title-measure {
    grid-area: 1 / 1;
    visibility: hidden;
    white-space: pre;
    overflow: hidden;
    padding-right: 2px;
    font-size: 1.25rem;
    font-weight: 600;
}
.kanban-card-panel__title {
    grid-area: 1 / 1;
    width: 0;
    min-width: 100%;
}
.kanban-card-panel__title :deep(input) {
    font-size: 1.25rem;
    font-weight: 600;
}
.kanban-card-panel__title :deep(.v-field__input) {
    padding-top: 0;
}
.kanban-card-panel.no-transition {
    transition: none;
}
/* Preserve the existing 2px timestamp row gap, outside Vuetify's spacing scale. */
.kanban-card-panel__timestamps {
    row-gap: 2px;
}
</style>
