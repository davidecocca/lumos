<template>
    <div class="kanban-card-properties d-flex align-center flex-wrap ga-2">
        <!-- Column selection -->
        <v-menu>
            <template #activator="{ props: menuProps }">
                <v-btn
                    v-bind="menuProps"
                    :color="columnColor"
                    :prepend-icon="
                        PROGRESS_TYPE_ICONS[currentColumn?.progressType] ||
                        'ph-circle'
                    "
                    append-icon="ph-caret-down"
                    variant="tonal"
                    size="small"
                    rounded="lg"
                    :disabled="disabled"
                    ><span class="text-truncate">{{
                        currentColumn?.name || 'Column'
                    }}</span></v-btn
                >
            </template>
            <v-list v-bind="listProps">
                <v-list-item
                    v-for="column in columns"
                    :key="column.id"
                    :title="column.name"
                    :append-icon="PROGRESS_TYPE_ICONS[column.progressType]"
                    :active="column.id === draft.columnId"
                    :rounded="'lg'"
                    @click="draft.columnId = column.id"
                />
            </v-list>
        </v-menu>
        <!-- Priority selection -->
        <v-menu>
            <template #activator="{ props: menuProps }">
                <v-btn
                    v-bind="menuProps"
                    :color="currentPriority?.color"
                    :prepend-icon="currentPriority?.icon || 'ph-flag'"
                    append-icon="ph-caret-down"
                    variant="tonal"
                    size="small"
                    rounded="lg"
                    :disabled="disabled"
                    >{{ currentPriority?.title || 'Priority' }}</v-btn
                >
            </template>
            <v-list v-bind="listProps">
                <v-list-item
                    v-for="priority in priorityItems"
                    :key="priority.value || 'none'"
                    :title="priority.title"
                    :append-icon="priority.icon"
                    :active="priority.value === draft.priority"
                    :rounded="'lg'"
                    @click="draft.priority = priority.value"
                />
            </v-list>
        </v-menu>
        <!-- Due date selection -->
        <v-menu v-model="dueDateMenu" :close-on-content-click="false">
            <template #activator="{ props: dateProps }">
                <v-btn
                    v-bind="dateProps"
                    prepend-icon="ph-calendar-blank"
                    append-icon="ph-caret-down"
                    variant="tonal"
                    size="small"
                    rounded="lg"
                    :disabled="disabled"
                    aria-label="Due date"
                    >{{ dueDateLabel }}</v-btn
                >
            </template>
            <v-date-picker
                v-model:year="calendarYear"
                :model-value="selectedDueDate"
                :min="minDueDate"
                :max="maxDueDate"
                color="primary"
                rounded="lg"
                height="auto"
                hide-header
                :disabled="disabled"
                @update:model-value="setDueDate"
            >
                <template #actions>
                    <v-btn
                        rounded="lg"
                        variant="text"
                        :disabled="disabled || !draft.dueDate"
                        @click="setDueDate(null)"
                        >Clear</v-btn
                    >
                </template>
            </v-date-picker>
        </v-menu>
    </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { toLocalDateString } from './utils/dates.js';
import {
    PRIORITIES,
    PROGRESS_TYPE_COLORS,
    PROGRESS_TYPE_ICONS,
} from './utils/constants.js';

const draft = defineModel({ type: Object, required: true });
const props = defineProps({
    columns: { type: Array, required: true },
    disabled: Boolean,
});
const dueDateMenu = ref(false);
const selectedDueDate = computed(() =>
    draft.value.dueDate ? new Date(`${draft.value.dueDate}T00:00:00`) : null,
);
const calendarYear = ref(new Date().getFullYear());
const firstCalendarYear = computed(() =>
    Math.min(9979, Math.max(1, calendarYear.value - 10)),
);
// Vuetify renders every year between min/max. Keep a moving window instead of 9,999 buttons.
// Parse in local time with ISO strings so years below 100 are not treated as 19xx.
const minDueDate = computed(
    () =>
        new Date(
            `${String(firstCalendarYear.value).padStart(4, '0')}-01-01T00:00:00`,
        ),
);
const maxDueDate = computed(
    () =>
        new Date(
            `${String(firstCalendarYear.value + 20).padStart(4, '0')}-12-31T00:00:00`,
        ),
);
watch(dueDateMenu, (open) => {
    if (open)
        calendarYear.value =
            selectedDueDate.value?.getFullYear() || new Date().getFullYear();
});
function setDueDate(value) {
    if (props.disabled) return;
    draft.value.dueDate = value ? toLocalDateString(value) : null;
    dueDateMenu.value = false;
}
const listProps = {
    nav: true,
    density: 'compact',
    class: 'pa-2',
    rounded: 'lg',
};
const dueDateLabel = computed(() => {
    if (!draft.value.dueDate) return 'Due date';
    const date = new Date(`${draft.value.dueDate}T00:00:00`);
    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    });
});
const priorityItems = [
    { title: 'No priority', value: null, icon: 'ph-minus' },
    ...PRIORITIES,
];
const currentColumn = computed(() =>
    props.columns.find((column) => column.id === draft.value.columnId),
);
const currentPriority = computed(() =>
    PRIORITIES.find((priority) => priority.value === draft.value.priority),
);
const columnColor = computed(
    () => PROGRESS_TYPE_COLORS[currentColumn.value?.progressType],
);
</script>

<style scoped>
/* Internal button-content sizing has no native props. */
.kanban-card-properties :deep(.v-btn) {
    max-width: 100%;
}
.kanban-card-properties :deep(.v-btn__content) {
    min-width: 0;
}
</style>
