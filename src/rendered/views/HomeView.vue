<template>
    <div class="d-flex flex-column">
        <div class="d-flex align-center ga-3 mb-4">
            <v-tabs
                v-model="tab"
                align-tabs="start"
                color="primary"
                class="flex-grow-1"
            >
                <v-tab :value="favoritesTab" prepend-icon="ph-heart"
                    >Favorites</v-tab
                >
                <v-tab
                    :value="recentsTab"
                    prepend-icon="ph-clock-counter-clockwise"
                    >Recents</v-tab
                >
            </v-tabs>
            <v-tooltip
                text="Create a folder before adding a note"
                location="bottom"
                :disabled="loading || store.folders.length > 0"
            >
                <template #activator="{ props }">
                    <span
                        v-bind="props"
                        class="d-inline-flex flex-shrink-0"
                        :tabindex="
                            !loading && !store.folders.length ? 0 : undefined
                        "
                    >
                        <v-btn
                            color="primary"
                            variant="tonal"
                            prepend-icon="ph-plus"
                            rounded="lg"
                            :disabled="loading || !store.folders.length"
                            @click="
                                store.openCreateNoteDialog(
                                    store.activeFolderId,
                                    true,
                                )
                            "
                            >New note</v-btn
                        >
                    </span>
                </template>
            </v-tooltip>
        </div>

        <v-tabs-window v-model="tab">
            <!-- Favorite notes -->
            <v-tabs-window-item :value="favoritesTab">
                <v-row v-if="loading" density="comfortable">
                    <v-col
                        v-for="card in 3"
                        :key="card"
                        cols="12"
                        md="6"
                        lg="4"
                    >
                        <v-card
                            class="border pa-4"
                            elevation="0"
                            height="180"
                            rounded="lg"
                        >
                            <v-skeleton-loader
                                type="heading, text, text, actions"
                            />
                        </v-card>
                    </v-col>
                </v-row>
                <template v-else-if="(favoriteNotes?.length ?? 0) === 0">
                    <v-row class="justify-center">
                        <v-col cols="12" md="8" class="d-flex justify-center">
                            <EmptyState
                                title="No favorite notes yet"
                                text="Mark a note as favorite to see it here."
                                icon="ph-heart-break"
                            />
                        </v-col>
                    </v-row>
                </template>
                <template v-else>
                    <v-row density="comfortable">
                        <v-col
                            v-for="note in favoriteNotes"
                            :key="note.id"
                            cols="12"
                            md="6"
                            lg="4"
                        >
                            <NoteCard
                                :note="note"
                                :showAccessedAt="false"
                                :showUpdatedAt="true"
                            />
                        </v-col>
                    </v-row>
                </template>
            </v-tabs-window-item>

            <!-- Recent notes -->
            <v-tabs-window-item :value="recentsTab">
                <v-row v-if="loading" density="comfortable">
                    <v-col
                        v-for="card in 3"
                        :key="card"
                        cols="12"
                        md="6"
                        lg="4"
                    >
                        <v-card
                            class="border pa-4"
                            elevation="0"
                            height="180"
                            rounded="lg"
                        >
                            <v-skeleton-loader
                                type="heading, text, text, actions"
                            />
                        </v-card>
                    </v-col>
                </v-row>
                <template v-else-if="(recentNotes?.length ?? 0) === 0">
                    <v-row class="justify-center">
                        <v-col cols="12" md="8" class="d-flex justify-center">
                            <EmptyState
                                title="No recent notes yet"
                                text="Open a note to see it here."
                                icon="ph-bed"
                            />
                        </v-col>
                    </v-row>
                </template>
                <template v-else>
                    <v-row density="comfortable">
                        <v-col
                            v-for="note in recentNotes"
                            :key="note.id"
                            cols="12"
                            md="6"
                            lg="4"
                        >
                            <NoteCard
                                :note="note"
                                :showAccessedAt="true"
                                :showUpdatedAt="false"
                            />
                        </v-col>
                    </v-row>
                </template>
            </v-tabs-window-item>
        </v-tabs-window>
    </div>
</template>

<script setup>
import EmptyState from '../components/commons/EmptyState.vue';
import NoteCard from '../components/home/NoteCard.vue';

import { computed, onMounted, ref } from 'vue';

import { useFoldersStore } from '../stores/foldersStore.js';

const emit = defineEmits(['home-ready']);

const store = useFoldersStore();

// Map store state to local computed refs
const favoriteNotes = computed(() => store.favoriteNotes);
const recentNotes = computed(() => store.recentNotes.slice(0, 9)); // Limit to 9 recent notes

// Tabs for switching between favorite and recent notes
const favoritesTab = 'favoritesTab';
const recentsTab = 'recentsTab';
const tab = ref(favoritesTab);
const loading = ref(true);

onMounted(async () => {
    await Promise.all([
        store.fetchFavoriteNotes(),
        store.fetchLastViewedNotes(),
    ]);

    loading.value = false;
    emit('home-ready');
});
</script>
