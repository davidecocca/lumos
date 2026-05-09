<template>
    <v-list
    density="compact"
    nav
    >
    <v-menu location="end" :close-on-content-click="false">
        <template v-slot:activator="{ props: menuProps }">
            <v-tooltip
            location="right"
            text="Favorites"
            >
            <template v-slot:activator="{ props: tooltipProps }">
                <v-list-item
                v-bind="{ ...menuProps, ...tooltipProps }"
                >
                <template v-slot:prepend>
                    <v-icon icon="ph-heart"></v-icon>
                </template>
            </v-list-item>
        </template>
    </v-tooltip>
</template>
<v-list density="compact" nav min-width="260" max-height="800" rounded="lg">
    <v-list-subheader>Favorites</v-list-subheader>
    <v-list-item
    v-for="note in favoriteNotes"
    :key="note.id"
    :active="note.id === activeNoteId"
    @click="store.openNote(note.id, router)"
    >
    <template v-slot:prepend>
        <v-icon :icon="note.id === activeNoteId ? 'ph-file-text-fill' : 'ph-file-text'" />
    </template>
    <template v-slot:title>
        <span :class="{ 'font-weight-bold': note.id === activeNoteId }">{{ note.title }}</span>
    </template>
</v-list-item>
<v-list-item v-if="favoriteNotes.length === 0" prepend-icon="ph-heart-break">
    <v-list-item-subtitle>No favorite notes yet</v-list-item-subtitle>
</v-list-item>
</v-list>
</v-menu>

<v-menu location="end" :close-on-content-click="false">
    <template v-slot:activator="{ props: menuProps }">
        <v-tooltip
        location="right"
        text="Notes"
        >
        <template v-slot:activator="{ props: tooltipProps }">
            <v-list-item
            v-bind="{ ...menuProps, ...tooltipProps }"
            >
            <template v-slot:prepend>
                <v-icon icon="ph-folder"></v-icon>
            </template>
        </v-list-item>
    </template>
</v-tooltip>
</template>
<v-list density="compact" nav min-width="280" max-height="800" indent="16px" rounded="lg">
    <v-list-subheader>Notes</v-list-subheader>
    <v-list-group
    v-for="folder in folders"
    :key="folder.id"
    :value="folder.id"
    :prepend-icon="folder.isOpen ? 'ph-folder-open' : 'ph-folder'"
    >
    <template v-slot:activator="{ props }">
        <v-list-item
        v-bind="props"
        @click="store.toggleFolderOpen(folder)"
        >
        <v-list-item-title>{{ folder.name }}</v-list-item-title>
        <template v-slot:append>
            <v-progress-circular
            v-if="folder.loading"
            size="20"
            indeterminate
            ></v-progress-circular>
        </template>
    </v-list-item>
</template>
<v-list-item
v-for="note in folder.notes"
:key="note.id"
:active="note.id === activeNoteId"
@click="store.openNote(note.id, router)"
>
<template v-slot:prepend>
    <v-icon :icon="note.id === activeNoteId ? 'ph-file-text-fill' : 'ph-file-text'" />
</template>
<template v-slot:title>
    <span :class="{ 'font-weight-bold': note.id === activeNoteId }">{{ note.title }}</span>
</template>
</v-list-item>
<v-list-item v-if="folder.notes.length === 0 && !folder.loading" prepend-icon="ph-file-dashed">
    <v-list-item-subtitle>No notes yet</v-list-item-subtitle>
</v-list-item>
</v-list-group>
<v-list-item v-if="folders.length === 0" prepend-icon="ph-folder-dashed">
    <v-list-item-subtitle>No folders yet</v-list-item-subtitle>
</v-list-item>
</v-list>
</v-menu>
</v-list>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFoldersStore } from '../../stores/foldersStore'

const router = useRouter()
const store = useFoldersStore()

const folders = computed(() => store.folders)
const favoriteNotes = computed(() => store.favoriteNotes)
const activeNoteId = computed(() => store.activeNoteId)

onMounted(async () => {
    await store.fetchFolders()
    await store.fetchFavoriteNotes()
})
</script>
