<template>
    <div class="d-flex flex-column">
        <!-- Page title -->
        <ViewTitle title="Welcome back!" :subtitle="subtitle" />

        <v-tabs v-model="tab" align-tabs="center" color="primary" class="mb-4">
            <v-tab :value="favoritesTab" prepend-icon="ph-heart"
                >Favorites</v-tab
            >
            <v-tab :value="recentsTab" prepend-icon="ph-clock-counter-clockwise"
                >Recents</v-tab
            >
        </v-tabs>

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
                            height="220"
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
                            height="220"
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
import ViewTitle from '../components/commons/ViewTitle.vue';
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

const subtitles = ref([
    'Your thoughts, all in one place.',
    'Capture. Organize. Remember.',
    'From quick scribbles to big ideas.',
    'Your second brain, ready to go.',
    'Find it fast, remember it forever.',
    'Because great ideas deserve a safe home.',
    'Notes that work as hard as you do.',
    'Your day, neatly organized.',
    'Where your ideas come to life.',
    'Search less, do more.',
]);
const subtitle = ref('');

onMounted(async () => {
    subtitle.value =
        subtitles.value[Math.floor(Math.random() * subtitles.value.length)];

    await Promise.all([
        store.fetchFavoriteNotes(),
        store.fetchLastViewedNotes(),
    ]);

    loading.value = false;
    emit('home-ready');
});
</script>
