<template>
    <div class="d-flex flex-column">
        <!-- Page title -->
        <div class="d-flex flex-column align-center mt-2 mb-4">
            <p class="text-h4 font-weight-medium">Welcome back!</p>
            <p class="text-h6 font-weight-light">{{ subtitle }}</p>
        </div>
        
        <v-tabs
        v-model="tab"
        align-tabs="center"
        color="primary"
        class="mb-4"
        >
        <v-tab :value="favoritesTab">Favorites</v-tab>
        <v-tab :value="recentsTab">Recents</v-tab>
    </v-tabs>
    
    <v-tabs-window v-model="tab">
        <!-- Favorite notes -->
        <v-tabs-window-item :value="favoritesTab">
            <v-container fluid>
                <template v-if="(favoriteNotes?.length ?? 0) === 0">
                    <v-row justify="center">
                        <v-col cols="12" md="8" class="d-flex justify-center">
                            <EmptyState
                                title="No favorite notes yet"
                                text="Mark a note as favorite and it will appear here."
                                icon="mdi-heart-outline"
                            />
                        </v-col>
                    </v-row>
                </template>
                <template v-else>
                    <v-row>
                        <v-col
                            v-for="note in favoriteNotes"
                            :key="note.id"
                            cols="12"
                            md="4"
                        >
                            <NoteCard
                                :note="note"
                                :showAccessedAt="false"
                                :showUpdatedAt="true"
                            />
                        </v-col>
                    </v-row>
                </template>
            </v-container>
        </v-tabs-window-item>
    
    <!-- Recent notes -->
    <v-tabs-window-item :value="recentsTab">
        <v-container fluid>
            <template v-if="(recentNotes?.length ?? 0) === 0">
                <v-row justify="center">
                    <v-col cols="12" md="8" class="d-flex justify-center">
                        <EmptyState
                            title="No recently viewed notes yet"
                            text="Open a note and it will appear here."
                            icon="mdi-history"
                        />
                    </v-col>
                </v-row>
            </template>
            <template v-else>
                <v-row>
                    <v-col
                        v-for="note in recentNotes"
                        :key="note.id"
                        cols="12"
                        md="4"
                    >
                        <NoteCard
                            :note="note"
                            :showAccessedAt="true"
                            :showUpdatedAt="false"
                        />
                    </v-col>
                </v-row>
            </template>
        </v-container>
    </v-tabs-window-item>
</v-tabs-window>
</div>
</template>

<script setup>
import NoteCard from '../components/home/NoteCard.vue';
import EmptyState from '../components/home/EmptyState.vue';

import { computed, onMounted, ref } from 'vue';

import { useFoldersStore } from '../stores/foldersStore.js';

const store = useFoldersStore()

// Map store state to local computed refs
const favoriteNotes = computed(() => store.favoriteNotes)
const recentNotes = computed(() => store.recentNotes.slice(0, 9))      // Limit to 9 recent notes

// Tabs for switching between favorite and recent notes
const favoritesTab = 'favoritesTab'
const recentsTab = 'recentsTab'
const tab = ref(favoritesTab)

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
])
const subtitle = ref('')

onMounted(async () => {
    // Fetch favorite notes
    await store.fetchFavoriteNotes()
    // Fetch recent notes
    await store.fetchLastViewedNotes()
    // Set a random subtitle
    subtitle.value = subtitles.value[Math.floor(Math.random() * subtitles.value.length)]
})
</script>