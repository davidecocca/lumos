<template>
    <!-- Main container -->
    <v-list
    density="compact"
    nav
    >

    <!-- Favorites -->
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
    <v-list-subheader class="text-title-small">Favorites</v-list-subheader>
    <v-list-item
    v-for="note in favoriteNotes"
    :key="note.id"
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
<v-list-item v-if="favoriteNotes.length === 0" prepend-icon="ph-heart-break">
    <v-list-item-subtitle>No favorite notes yet</v-list-item-subtitle>
</v-list-item>
</v-list>
</v-menu>

<!-- Folders and notes -->
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

<!-- Folder tree -->
<v-list density="compact" nav min-width="280" max-height="800" indent="16px" rounded="lg">
    <v-list-item class="pr-1">
        <template v-slot:title>
            <v-list-subheader class="pa-0 text-title-small">Notes</v-list-subheader>
        </template>

        <template v-slot:append>
            <div class="d-flex align-center">
                <v-tooltip text="New folder" location="top">
                    <template v-slot:activator="{ props }">
                        <v-btn
                        v-bind="props"
                        icon="ph-folder-simple-plus"
                        variant="text"
                        size="default"
                        density="compact"
                        color="surface-variant"
                        rounded
                        @click="store.openCreateFolderDialog()"
                        />
                    </template>
                </v-tooltip>
            </div>
        </template>
    </v-list-item>
    <v-list-group
    v-for="folder in folders"
    :key="folder.id"
    :value="folder.id"
    :prepend-icon="folder.isOpen ? 'ph-folder-open' : 'ph-folder'"
    >
    <template v-slot:activator="{ props }">
        <v-list-item
        v-bind="props"
        class="pe-0"
        @mouseenter="hoveredActionKey = getActionKey('folder', folder.id)"
        @mouseleave="hoveredActionKey = null"
        @click="store.toggleFolderOpen(folder)"
        >
        <v-list-item-title>{{ folder.name }}</v-list-item-title>
        <template v-slot:append>
            <div class="d-flex align-center ga-2">
                <v-progress-circular
                v-if="folder.loading"
                size="20"
                indeterminate
                ></v-progress-circular>
                <FolderActionMenu
                :folder="folder"
                :visible="isActionVisible('folder', folder.id)"
                :model-value="activeActionMenuKey === getActionKey('folder', folder.id)"
                @update:model-value="setActionMenuOpen('folder', folder.id, $event)"
                />
    </div>
        </template>
    </v-list-item>
</template>

<!-- Notes within folder -->
<v-list-item
v-for="note in folder.notes"
:key="note.id"
:active="note.id === activeNoteId"
class="pr-1"
@mouseenter="hoveredActionKey = getActionKey('note', note.id)"
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
import { useFolderTreeActions } from '../composables/useFolderTreeActions'
import FolderActionMenu from '../menus/FolderActionMenu.vue'
import NoteActionMenu from '../menus/NoteActionMenu.vue'

import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFoldersStore } from '../../../stores/foldersStore'

const router = useRouter()
const store = useFoldersStore()

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

onMounted(async () => {
    await store.fetchFolders()
    await store.fetchFavoriteNotes()
})
</script>
