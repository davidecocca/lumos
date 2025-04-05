<template>
    <div class="d-flex flex-column">
        <!-- Page title -->
        <div class="d-flex flex-column align-center">
            <p class="text-h4">Welcome to <b>Lumos</b></p>
            <p class="text-h6">Your notes, your way.</p>
        </div>
        
        <!-- Favorite notes -->
        <NoteCardsSlideGroup :notes="favoriteNotes" :showAccessedAt="false" :showUpdatedAt="true" title="Favorites" icon="mdi-heart" tooltipText="Your peak notes"/>
        
        <!-- Recent notes -->
        <NoteCardsSlideGroup :notes="recentNotes" :showAccessedAt="true" :showUpdatedAt="false" title="Recents" icon="mdi-history" tooltipText="Jump into notes you've seen recently"/>
    </div>
</template>

<script setup>
import NoteCardsSlideGroup from '../components/home/NoteCardsSlideGroup.vue';
import { computed, onMounted, ref } from 'vue';

import { useFoldersStore } from '../stores/foldersStore.js';

const store = useFoldersStore()

// Map store state to local computed refs
const favoriteNotes = computed(() => store.favoriteNotes)
const recentNotes = computed(() => store.recentNotes)

onMounted(async () => {
    // Fetch favorite notes
    await store.fetchFavoriteNotes()
    // Fetch recent notes
    await store.fetchLastViewedNotes()
})
</script>