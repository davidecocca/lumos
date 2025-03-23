<template>
    <!-- Page title -->
    <div class="d-flex flex-column align-center">
        <p class="text-h4">Welcome to <b>Lumos</b></p>
        <p class="text-h6">Your notes, your way.</p>
    </div>
    
    <!-- Favorite notes -->
    <NoteCardsSlideGroup :notes="favoriteNotes" title="Favorites" icon="mdi-heart" tooltipText="Your peak notes"/>
    
    <!-- Recent notes -->
    <NoteCardsSlideGroup :notes="recentNotes" title="Recents" icon="mdi-history" tooltipText="Jump into notes you've seen recently"/>
    
</template>

<script setup>
import NoteCardsSlideGroup from '../components/home/NoteCardsSlideGroup.vue';

// Mock data for notes. In future, this will be replaced with actual data from the database.
const notes = [
{
    id: 1,
    title: 'Note 1',
    content: 'This is the content of note 1.',
    favorite: true,
    folder: 'Personal',
    lastModified: '2025-03-17T12:00:00Z'
},
{
    id: 2,
    title: 'Note 2',
    content: 'This is the content of note 2.',
    favorite: false,
    folder: 'Personal',
    lastModified: '2025-03-17T11:00:00Z'
},
{
    id: 3,
    title: 'Note 3',
    content: 'This is the content of note 3.',
    favorite: true,
    folder: 'Work',
    lastModified: '2025-03-17T10:00:00Z'
},
{
    id: 4,
    title: 'Note 4',
    content: 'This is the content of note 4.',
    favorite: true,
    folder: 'Work',
    lastModified: '2025-03-15T09:00:00Z'
},
{
    id: 5,
    title: 'Note 5',
    content: 'This is the content of note 5.',
    favorite: true,
    folder: 'Project X',
    lastModified: '2025-02-14T08:00:00Z'
},
{
    id: 6,
    title: 'Note 6',
    content: 'This is the content of note 6.',
    favorite: true,
    folder: 'Project X',
    lastModified: '2025-02-13T07:00:00Z'
},
]

// Filter the notes to only show the favorite ones
const favoriteNotes = notes.filter(note => note.favorite);

// Filter the notes to only show the recent ones
const recentNotes = notes.filter(note => {
    const lastModifiedDate = new Date(note.lastModified);
    const currentDate = new Date();
    const timeDifference = currentDate - lastModifiedDate;
    const daysDifference = timeDifference / (1000 * 3600 * 24);
    return daysDifference <= 7; // Show notes modified in the last 7 days
});

</script>