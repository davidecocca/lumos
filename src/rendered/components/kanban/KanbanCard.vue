<template>
    <v-card
        :data-card-id="card.id"
        tag="div"
        role="button"
        :tabindex="disabled ? -1 : 0"
        :aria-label="`Edit ${card.title}`"
        :aria-disabled="disabled"
        :draggable="!disabled"
        elevation="0"
        rounded="lg"
        class="kanban-card cursor-grab border pa-1 mb-2"
        @click="!disabled && emit('edit')"
        @keydown.enter.self.prevent="!disabled && emit('edit')"
        @keydown.space.self.prevent="!disabled && emit('edit')"
    >
        <v-card-item class="pa-3">
            <v-card-title
                class="text-body-medium font-weight-medium text-wrap text-break"
                >{{ card.title }}</v-card-title
            >
            <template #append>
                <KanbanCardActionsMenu
                    show-edit
                    button-size="x-small"
                    :label="`Actions for ${card.title}`"
                    :disabled="disabled"
                    :can-move-up="canMoveUp"
                    :can-move-down="canMoveDown"
                    @edit="emit('edit')"
                    @duplicate="emit('duplicate')"
                    @move="emit('move', $event)"
                    @delete="emit('delete')"
                />
            </template>
        </v-card-item>
        <v-card-text
            v-if="preview"
            class="text-body-small text-medium-emphasis px-3 pt-0 pb-3"
        >
            <p class="kanban-card__description overflow-hidden ma-0">
                {{ preview }}
            </p>
        </v-card-text>
        <div
            v-if="
                card.priority ||
                card.dueDate ||
                card.tags?.length ||
                card.noteIds?.length
            "
            class="d-flex flex-column ga-2 px-3 pb-3"
        >
            <div
                v-if="card.priority || card.dueDate"
                class="d-flex flex-wrap ga-1"
            >
                <v-chip
                    v-if="priority"
                    :color="priority.color"
                    :prepend-icon="priority.icon"
                    size="x-small"
                    variant="tonal"
                    rounded="lg"
                    >{{ priority.title }}</v-chip
                >
                <v-chip
                    v-if="due"
                    :color="due.color"
                    prepend-icon="ph-calendar-blank"
                    :title="`Due ${card.dueDate}`"
                    size="x-small"
                    variant="tonal"
                    rounded="lg"
                    >{{ due.label }}</v-chip
                >
            </div>
            <div
                v-if="card.tags?.length"
                class="d-flex align-center flex-wrap ga-1"
            >
                <v-chip
                    v-for="tag in card.tags.slice(0, 3)"
                    :key="tag"
                    :title="tag"
                    size="x-small"
                    variant="tonal"
                    rounded="lg"
                    max-width="100%"
                    ><span class="text-truncate">{{ tag }}</span></v-chip
                >
                <span
                    v-if="card.tags.length > 3"
                    class="text-body-small text-medium-emphasis"
                    :title="card.tags.slice(3).join(', ')"
                    :aria-label="`${card.tags.length - 3} more tags: ${card.tags.slice(3).join(', ')}`"
                    >+{{ card.tags.length - 3 }}</span
                >
            </div>
            <div
                v-if="card.noteIds?.length"
                class="d-flex align-center ga-1 text-body-small text-medium-emphasis"
                :title="`${card.noteIds.length} linked notes`"
            >
                <v-icon icon="ph-link" size="14" />
                <span
                    >{{ card.noteIds.length }}
                    {{
                        card.noteIds.length === 1
                            ? 'linked note'
                            : 'linked notes'
                    }}</span
                >
            </div>
        </div>
    </v-card>
</template>

<script setup>
import { computed } from 'vue';
import { extractDescriptionText } from './utils/cards.js';
import { getCardDueDateDisplay } from './utils/dates.js';
import { PRIORITIES } from './utils/constants.js';
import KanbanCardActionsMenu from './KanbanCardActionsMenu.vue';
const props = defineProps({
    card: { type: Object, required: true },
    columns: { type: Array, required: true },
    today: { type: String, required: true },
    disabled: Boolean,
    canMoveUp: Boolean,
    canMoveDown: Boolean,
});
const emit = defineEmits(['edit', 'duplicate', 'move', 'delete']);
const preview = computed(() => extractDescriptionText(props.card.description));
const priority = computed(() =>
    PRIORITIES.find((item) => item.value === props.card.priority),
);
const due = computed(() =>
    getCardDueDateDisplay(props.card, props.columns, props.today),
);
</script>

<style scoped>
/* Preserve the accessible focus ring and three-line, whitespace-aware preview. */
.kanban-card:focus-visible {
    outline: 2px solid rgb(var(--v-theme-primary));
    outline-offset: 2px;
}
.kanban-card__description {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}
</style>
