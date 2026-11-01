<template>
    <BaseDialog
        v-model="open"
        title="Edit columns"
        subtitle="Define your workflow, one column at a time."
        icon="ph-columns"
        :max-width="760"
        :persistent="busy"
    >
        <v-form id="kanban-columns-form" @submit.prevent="emit('save')">
            <div
                v-for="(column, index) in columnsDraft"
                :key="column.id"
                class="kanban-column-row d-flex align-center ga-2 mb-3"
                :class="{
                    'kanban-column-row--dragging position-relative rounded-lg cursor-grabbing':
                        columnDrag?.id === column.id,
                }"
                :style="
                    columnDrag?.id === column.id
                        ? { transform: `translateY(${columnDrag.offset}px)` }
                        : undefined
                "
            >
                <v-btn
                    icon="ph-dots-six-vertical"
                    variant="text"
                    size="small"
                    density="comfortable"
                    rounded="lg"
                    class="kanban-column-handle cursor-grab flex-shrink-0 text-medium-emphasis"
                    :disabled="disabled"
                    @pointerdown="startColumnDrag($event, column.id)"
                    @dragstart.prevent
                    @keydown.up.prevent="reorderColumn(index, -1)"
                    @keydown.down.prevent="reorderColumn(index, 1)"
                />
                <v-row no-gutters class="flex-grow-1">
                    <v-col cols="12" sm="6">
                        <v-text-field
                            v-model="column.name"
                            label="Column name"
                            variant="outlined"
                            rounded="lg"
                            maxlength="80"
                            hide-details
                            density="compact"
                            :disabled="busy"
                        />
                    </v-col>
                    <v-col cols="12" sm="6" class="ps-sm-2 mt-2 mt-sm-0">
                        <v-select
                            v-model="column.progressType"
                            :items="PROGRESS_TYPES"
                            label="Progress type"
                            variant="outlined"
                            rounded="lg"
                            hide-details
                            density="compact"
                            :disabled="busy"
                            :menu-props="{ contentClass: 'rounded-lg' }"
                            :list-props="{
                                nav: true,
                                density: 'compact',
                                class: 'pa-2',
                                rounded: 'lg',
                            }"
                            :item-props="() => ({ rounded: 'lg' })"
                        />
                    </v-col>
                </v-row>
                <v-btn
                    icon="ph-trash"
                    variant="text"
                    size="small"
                    density="comfortable"
                    rounded="lg"
                    color="error"
                    :disabled="
                        disabled ||
                        columnsDraft.length === 1 ||
                        cards.some((card) => card.columnId === column.id)
                    "
                    :aria-label="`Delete ${column.name}`"
                    @click="columnsDraft.splice(index, 1)"
                />
            </div>
            <v-btn
                variant="text"
                prepend-icon="ph-plus"
                rounded="lg"
                :disabled="disabled || columnsDraft.length >= 50"
                @click="addColumn"
                >Add column</v-btn
            >
            <v-alert
                v-if="error"
                type="error"
                variant="tonal"
                rounded="lg"
                density="comfortable"
                class="mt-3"
                >{{ error }}</v-alert
            >
        </v-form>
        <template #actions>
            <v-spacer />
            <v-btn
                rounded="lg"
                variant="text"
                :disabled="busy"
                @click="open = false"
                >Cancel</v-btn
            >
            <v-btn
                rounded="lg"
                type="submit"
                form="kanban-columns-form"
                color="primary"
                variant="tonal"
                :loading="busy"
                :disabled="
                    disabled ||
                    columnsDraft.some((column) => !column.name.trim())
                "
                >Save</v-btn
            >
        </template>
    </BaseDialog>
</template>

<script setup>
import { toRef, watch } from 'vue';

import BaseDialog from '../../commons/BaseDialog.vue';
import { PROGRESS_TYPES } from '../utils/constants.js';
import { useKanbanColumnDrag } from '../composables/useKanbanColumnDrag.js';

const open = defineModel({ type: Boolean, default: false });
const columnsDraft = defineModel('columns', {
    type: Array,
    default: () => [],
});
const props = defineProps({
    cards: { type: Array, default: () => [] },
    busy: Boolean,
    disabled: Boolean,
    error: { type: String, default: '' },
});
const emit = defineEmits(['save']);
const disabled = toRef(props, 'disabled');
const { columnDrag, reorderColumn, startColumnDrag, clearColumnDrag } =
    useKanbanColumnDrag({ columnsDraft, disabled });
watch([open, disabled], () => {
    if (!open.value || disabled.value) clearColumnDrag();
});
function addColumn() {
    columnsDraft.value.push({
        // Negative IDs identify unsaved rows only; SQLite assigns persisted IDs.
        id: Math.min(0, ...columnsDraft.value.map((column) => column.id)) - 1,
        name: '',
        progressType: 'active',
    });
}
</script>

<style scoped>
/* Pointer reordering needs touch suppression, active cursor, and an exact drag shadow. */
.kanban-column-handle {
    touch-action: none;
}
.kanban-column-handle:active {
    cursor: grabbing !important;
}
.kanban-column-row--dragging {
    z-index: 1;
    background: rgb(var(--v-theme-surface));
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}
</style>
