<template>
    <!-- Favorites -->
    <v-list
    v-if="favoriteNotes.length > 0"
    nav
    density="compact"
    >
    <v-list-subheader>Favorites</v-list-subheader>
    
    <v-list-item
    v-for="(note, k) in favoriteNotes"
    :key="k"
    :active="note.id === activeNoteId"
    class="pr-1"
    @mouseenter="hoveredActionKey = getActionKey('favorite-note', note.id)"
    @mouseleave="hoveredActionKey = null"
    @click="store.openNote(note.id, router)"
    >
    <template v-slot:prepend>
        <v-icon :icon="note.id === activeNoteId ? 'ph-file-fill' : 'ph-file'" />
    </template>
    <template v-slot:title>
        <span :class="{ 'font-weight-bold': note.id === activeNoteId }">{{ note.title }}</span>
    </template>
    <template v-slot:append>
        <NoteActionMenu
        :note="note"
        :visible="isActionVisible('favorite-note', note.id)"
        :model-value="activeActionMenuKey === getActionKey('favorite-note', note.id)"
        @update:model-value="setActionMenuOpen('favorite-note', note.id, $event)"
        @toggle-favorite="store.toggleNoteFavorite"
        @rename-note="store.openRenameNoteDialog"
        @move-note="store.openMoveNoteDialog"
        @delete-note="store.openDeleteNoteConfirmationDialog"
        />
    </template>
</v-list-item>
</v-list>

<!-- Folders and notes -->
<v-list
nav
density="compact"
indent="16px"
>
<v-list-item class="pr-1">
    <v-list-subheader class="pa-0">Notes</v-list-subheader>
    
    <template v-slot:append>
        <v-tooltip text="New folder" location="top">
            <template v-slot:activator="{ props }">
                <v-btn
                v-bind="props"
                icon="ph-folder-simple-plus"
                variant="text"
                size="small"
                density="compact"
                rounded="xl"
                @click="store.openCreateFolderDialog()"
                />
            </template>
        </v-tooltip>
    </template>
</v-list-item>

<!-- Folder tree -->
<v-list-group
v-for="folder in folders"
:key="folder.id"
:prepend-icon="folder.isOpen ? 'ph-folder-open' : 'ph-folder'"
>
<template v-slot:activator="{ props, isOpen }">
    <v-list-item
    v-bind="props"
    class="pe-0"
    :class="{ 'drop-target-folder': dropTargetFolderId === folder.id }"
    @mouseenter="hoveredActionKey = getActionKey('folder', folder.id)"
    @mouseleave="hoveredActionKey = null"
    @click="store.toggleFolderOpen(folder)"
    @dragenter.prevent="handleFolderDragEnter(folder.id)"
    @dragover.prevent="handleFolderDragOver(folder.id, $event)"
    @drop.prevent="handleFolderDrop(folder.id)"
    >
    <template v-slot:append>
        <div class="d-flex align-right ga-2">
            <div v-if="folder.loading" class="mr-2">
                <v-progress-circular size="20" indeterminate></v-progress-circular>
            </div>
            <FolderActionMenu
            :folder="folder"
            :visible="isActionVisible('folder', folder.id)"
            :model-value="activeActionMenuKey === getActionKey('folder', folder.id)"
            @update:model-value="setActionMenuOpen('folder', folder.id, $event)"
            />
        </div>
    </template>
    <v-list-item-title>{{ folder.name }}</v-list-item-title>
</v-list-item>
</template>

<!-- Notes within folder -->
<v-list-item
v-for="(note, k) in folder.notes"
:key="k"
:draggable="true"
class="pr-1"
:class="{ 'dragging-note': draggingNoteId === note.id }"
:active="note.id === activeNoteId"
@mouseenter="hoveredActionKey = getActionKey('note', note.id)"
@mouseleave="hoveredActionKey = null"
@click="store.openNote(note.id, router)"
@dragstart="handleNoteDragStart(note.id, folder.id, $event)"
@dragend="handleNoteDragEnd"
>
<template v-slot:prepend>
    <v-icon :icon="note.id === activeNoteId ? 'ph-file-fill' : 'ph-file'" />
</template>
<template v-slot:title>
    <span :class="{ 'font-weight-bold': note.id === activeNoteId }">{{ note.title }}</span>
</template>
<template v-slot:append>
    <NoteActionMenu
    :note="note"
    :visible="isActionVisible('note', note.id)"
    :model-value="activeActionMenuKey === getActionKey('note', note.id)"
    @update:model-value="setActionMenuOpen('note', note.id, $event)"
    @toggle-favorite="store.toggleNoteFavorite"
    @rename-note="store.openRenameNoteDialog"
    @move-note="store.openMoveNoteDialog"
    @delete-note="store.openDeleteNoteConfirmationDialog"
    />
</template>
</v-list-item>
<v-list-item v-if="folder.notes.length === 0" prepend-icon="ph-file-dashed">
    <v-list-item-subtitle>No notes yet</v-list-item-subtitle>
</v-list-item>
</v-list-group>
<v-list-item v-if="folders.length === 0" prepend-icon="ph-folder-dashed">
    <v-list-item-subtitle>No folders yet</v-list-item-subtitle>
</v-list-item>
</v-list>

</template>

<script setup>
import { useFolderTreeActions } from '../composables/useFolderTreeActions'
import { useFolderTreeDrag } from '../composables/useFolderTreeDrag'
import FolderActionMenu from '../menus/FolderActionMenu.vue'
import NoteActionMenu from '../menus/NoteActionMenu.vue'

import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFoldersStore } from '../../../stores/foldersStore'

// Get the router and the Pinia store instance
const router = useRouter()
const store = useFoldersStore()

// Map store state to local computed refs
const folders = computed(() => store.folders)
const favoriteNotes = computed(() => store.favoriteNotes)
const activeNoteId = computed(() => store.activeNoteId)
const {
    hoveredActionKey,
    activeActionMenuKey,
    getActionKey,
    setActionMenuOpen,
    isActionVisible
} = useFolderTreeActions()
const {
    draggingNoteId,
    dropTargetFolderId,
    handleNoteDragStart,
    handleNoteDragEnd,
    handleFolderDragEnter,
    handleFolderDragOver,
    handleFolderDrop
} = useFolderTreeDrag((...args) => store.moveNote(...args))

onMounted(async () => {
    // Lazy load folders; only fetch notes when a folder is expanded.
    await store.fetchFolders()
    // Also fetch favorite notes so they’re available from the start.
    await store.fetchFavoriteNotes()
})
</script>

<style scoped>
.drop-target-folder {
    background: rgba(15, 23, 42, 0.06);
    border-radius: 12px;
    outline: 2px dashed rgba(15, 23, 42, 0.2);
    outline-offset: -2px;
}

.dragging-note {
    opacity: 0.45;
}

.v-theme--dark .drop-target-folder {
    background: rgba(255, 255, 255, 0.08);
    outline-color: rgba(255, 255, 255, 0.2);
}
</style>
