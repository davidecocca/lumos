<template>
    <v-dialog v-model="dialogOpen" max-width="800" height="600">
        <v-card
            class="d-flex flex-column overflow-hidden h-100"
            rounded="xl"
            elevation="0"
        >
            <v-card-text class="d-flex flex-column overflow-hidden h-100">
                <v-sheet class="flex-shrink-0 bg-transparent">
                    <v-text-field
                        v-model="searchQuery"
                        variant="text"
                        density="comfortable"
                        rounded="lg"
                        placeholder="Search..."
                        prepend-icon="ph-magnifying-glass"
                        append-icon="ph-x"
                        autofocus
                        hide-details
                        @click:append="dialogOpen = false"
                    />
                    <v-divider></v-divider>
                </v-sheet>

                <v-sheet class="mt-2 flex-grow-1 h-0 overflow-y-auto">
                    <template v-if="isShowingSearchProgress">
                        <v-skeleton-loader
                            v-for="n in 4"
                            :key="n"
                            class="mt-1"
                            type="list-item-three-line"
                        />
                    </template>

                    <v-list v-else-if="visibleNotes.length === 0">
                        <v-list-item
                            :prepend-icon="
                                hasSearchQuery
                                    ? 'ph-binoculars'
                                    : 'ph-clock-counter-clockwise'
                            "
                            class="text-medium-emphasis"
                        >
                            {{
                                hasSearchQuery
                                    ? 'No results'
                                    : 'No recent notes yet'
                            }}
                        </v-list-item>
                    </v-list>

                    <template v-else>
                        <v-list
                            lines="three"
                            density="compact"
                            class="bg-transparent"
                        >
                            <v-list-item
                                v-for="note in visibleNotes"
                                :key="note.id"
                                rounded="lg"
                                lines="three"
                                @click="openNote(note.id)"
                            >
                                <v-list-item-title class="font-weight-medium">
                                    {{ note.title }}
                                </v-list-item-title>

                                <v-list-item-subtitle
                                    class="text-body-2 text-medium-emphasis"
                                >
                                    {{ note.topic || emptyStateSummary }}
                                </v-list-item-subtitle>

                                <template v-slot:append>
                                    <v-chip
                                        size="small"
                                        variant="tonal"
                                        color="primary"
                                        rounded="lg"
                                        prepend-icon="ph-folder"
                                    >
                                        {{ note.folder_name || 'Unfiled' }}
                                    </v-chip>
                                </template>
                            </v-list-item>
                        </v-list>
                    </template>
                </v-sheet>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { useFoldersStore } from '../../../stores/foldersStore';

import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(['update:modelValue']);

const store = useFoldersStore();
const router = useRouter();

const dialogOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value),
});

const searchQuery = ref('');
const searchResults = ref([]);
const isLoading = ref(false);
const isSearchPending = ref(false);
const emptyStateSummary = 'No content yet.';

let searchTimeout = null;
let searchRequestId = 0;

const hasSearchQuery = computed(() => Boolean(searchQuery.value.trim()));

const visibleNotes = computed(() => {
    if (!hasSearchQuery.value) {
        return store.recentNotes.slice(0, 10);
    }

    return searchResults.value;
});

const isShowingSearchProgress = computed(
    () => isLoading.value || isSearchPending.value,
);

const clearSearchTimeout = () => {
    if (!searchTimeout) return;

    clearTimeout(searchTimeout);
    searchTimeout = null;
};

const resetSearchState = () => {
    searchQuery.value = '';
    searchResults.value = [];
    isLoading.value = false;
    isSearchPending.value = false;
};

const performSearch = async (query) => {
    const requestId = ++searchRequestId;

    isSearchPending.value = false;
    isLoading.value = true;

    try {
        const results = await store.searchNotes(query, { limit: 10 });
        if (requestId !== searchRequestId) return;
        searchResults.value = results;
    } catch (err) {
        if (requestId !== searchRequestId) return;
        console.error('Error searching notes:', err);
        searchResults.value = [];
    } finally {
        if (requestId === searchRequestId) {
            isLoading.value = false;
        }
    }
};

const openNote = async (noteId) => {
    await store.openNote(noteId, router);
    dialogOpen.value = false;
};

watch(dialogOpen, async (isOpen) => {
    if (isOpen) {
        await store.fetchLastViewedNotes();
        return;
    }

    searchRequestId += 1;
    clearSearchTimeout();
    resetSearchState();
});

watch(searchQuery, (value) => {
    clearSearchTimeout();

    const normalizedQuery = value.trim();
    if (!normalizedQuery) {
        searchRequestId += 1;
        searchResults.value = [];
        isLoading.value = false;
        isSearchPending.value = false;
        return;
    }

    isSearchPending.value = true;
    searchTimeout = setTimeout(() => {
        searchTimeout = null;
        performSearch(normalizedQuery);
    }, 180);
});

onBeforeUnmount(() => {
    clearSearchTimeout();
});
</script>
