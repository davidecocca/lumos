<template>
    <div class="mb-4">
        <div class="d-flex align-center ga-3">
            <!-- Search field -->
            <v-text-field
                v-model="filters.query"
                placeholder="Search..."
                variant="outlined"
                density="compact"
                rounded="lg"
                hide-details
                clearable
                class="flex-grow-1"
                max-width="440"
                style="min-width: 0"
            >
                <template #prepend-inner>
                    <v-icon icon="ph-magnifying-glass" size="18" />
                </template>
            </v-text-field>

            <!-- Filters menu -->
            <v-menu
                v-model="filtersOpen"
                :close-on-content-click="false"
                location="bottom end"
                offset="12"
            >
                <template #activator="{ props }">
                    <v-btn
                        v-bind="props"
                        :variant="advancedFilterCount ? 'tonal' : 'text'"
                        :color="advancedFilterCount ? 'primary' : undefined"
                        prepend-icon="ph-funnel"
                        rounded="lg"
                        class="flex-shrink-0"
                    >
                        Filters{{
                            advancedFilterCount
                                ? ` · ${advancedFilterCount}`
                                : ''
                        }}
                    </v-btn>
                </template>
                <v-card
                    width="300"
                    max-width="calc(100vw - 32px)"
                    max-height="calc(100vh - 32px)"
                    rounded="lg"
                    class="px-4 pt-6 pb-1 overflow-y-auto"
                >
                    <div class="d-flex flex-column ga-3">
                        <!-- Priority filter -->
                        <v-select
                            v-model="filters.priority"
                            :items="priorityItems"
                            label="Priority"
                            variant="outlined"
                            density="compact"
                            rounded="lg"
                            hide-details
                            :menu-props="menuProps"
                            :list-props="listProps"
                            :item-props="
                                (priority) => ({
                                    ...itemProps(),
                                    appendIcon: priority.icon,
                                })
                            "
                        />
                        <!-- Tags filter -->
                        <v-autocomplete
                            v-model="filters.tags"
                            :items="tags"
                            label="Tags"
                            multiple
                            chips
                            closable-chips
                            variant="outlined"
                            density="compact"
                            rounded="lg"
                            hide-details
                            clearable
                            :menu-props="menuProps"
                            :list-props="listProps"
                            :item-props="itemProps"
                            no-data-text="No tags in this workspace yet."
                        />
                        <!-- Due date filter -->
                        <v-select
                            v-model="filters.due"
                            :items="dueItems"
                            label="Due date"
                            variant="outlined"
                            density="compact"
                            rounded="lg"
                            hide-details
                            :menu-props="menuProps"
                            :list-props="listProps"
                            :item-props="
                                (due) => ({
                                    ...itemProps(),
                                    appendIcon: due.icon,
                                })
                            "
                        />
                    </div>
                    <v-divider class="mt-4 mb-2" />
                    <v-card-actions class="pa-0">
                        <v-spacer />
                        <v-btn
                            :disabled="!active"
                            variant="text"
                            @click="emit('clear')"
                            >Clear filters</v-btn
                        >
                        <v-btn variant="tonal" @click="filtersOpen = false"
                            >Close</v-btn
                        >
                    </v-card-actions>
                </v-card>
            </v-menu>
        </div>
    </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { PRIORITIES } from './utils/constants.js';

const filters = defineModel({ type: Object, required: true });
defineProps({
    tags: { type: Array, default: () => [] },
    active: Boolean,
});
const emit = defineEmits(['clear']);
const filtersOpen = ref(false);
const advancedFilterCount = computed(
    () =>
        Number(Boolean(filters.value.priority)) +
        Number(Boolean(filters.value.tags?.length)) +
        Number(filters.value.due !== 'all'),
);
const priorityItems = [
    { title: 'All priorities', value: null, icon: 'ph-stack' },
    { title: 'No priority', value: 'none', icon: 'ph-minus' },
    ...PRIORITIES,
];
const dueItems = [
    { title: 'All dates', value: 'all', icon: 'ph-calendar-blank' },
    { title: 'Overdue', value: 'overdue', icon: 'ph-warning' },
    { title: 'Due today', value: 'today', icon: 'ph-clock' },
    { title: 'Due this week', value: 'week', icon: 'ph-calendar-dots' },
    { title: 'No due date', value: 'none', icon: 'ph-minus' },
];
const menuProps = { contentClass: 'rounded-lg' };
const listProps = {
    nav: true,
    density: 'compact',
    class: 'pa-2',
    rounded: 'lg',
    prependGap: 8,
};
const itemProps = () => ({ rounded: 'lg' });
</script>
