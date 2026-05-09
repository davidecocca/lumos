<template>
    <!-- Favorites notes -->
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
    @click="store.openNote(note.id, router)"
    >
    <template v-slot:prepend>
        <v-icon :icon="note.id === activeNoteId ? 'ph-file-text-fill' : 'ph-file-text'" />
    </template>
    <template v-slot:title>
        <span :class="{ 'font-weight-bold': note.id === activeNoteId }">{{ note.title }}</span>
    </template>
    <template v-slot:append>
        <!-- Note action menu -->
        <v-menu>
            <template v-slot:activator="{ props }">
                <v-tooltip text="More" location="top">
                    <template v-slot:activator="{ props: tooltipProps }">
                        <v-btn
                        v-bind="{ ...props, ...tooltipProps }"
                        icon="ph-dots-three"
                        size="small"
                        variant="text"
                        density="compact"
                        ></v-btn>
                    </template>
                </v-tooltip>
            </template>
            <v-list density="compact" rounded="lg" class="pl-1 pr-1 pt-2 pb-2">
                <v-list-item @click="store.toggleNoteFavorite(note.id)" rounded="lg">
                    <template v-slot:append>
                        <v-icon icon="ph-heart-break"></v-icon>
                    </template>
                    <v-list-item-title>Unfavorite</v-list-item-title>
                </v-list-item>
                <v-list-item @click="store.openRenameNoteDialog(note.id, note.title)" rounded="lg">
                    <template v-slot:append>
                        <v-icon icon="ph-pencil-line"></v-icon>
                    </template>
                    <v-list-item-title>Rename</v-list-item-title>
                </v-list-item>
                <v-list-item @click="store.openDeleteNoteConfirmationDialog(note.id)" rounded="lg">
                    <template v-slot:append>
                        <v-icon icon="ph-trash"></v-icon>
                    </template>
                    <v-list-item-title>Delete</v-list-item-title>
                </v-list-item>
            </v-list>
        </v-menu>
    </template>
</v-list-item>
</v-list>

<!-- Folders and notes -->
<v-list
nav
density="compact"
indent="16px"
>
<v-list-item class="notes-header">
    <template v-slot:title>
        <v-list-subheader class="pa-0">Notes</v-list-subheader>
    </template>
    
    <template v-slot:append>
        <v-tooltip text="New folder" location="top">
            <template v-slot:activator="{ props }">
                <v-btn
                v-bind="props"
                icon="ph-folder-plus"
                size="small"
                density="compact"
                variant="text"
                class="mr-n2"
                @click="store.openCreateFolderDialog()"
                />
            </template>
        </v-tooltip>
    </template>
</v-list-item>
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
            <v-tooltip text="New note" location="top">
                <template v-slot:activator="{ props }">
                    <v-btn
                    v-bind="props"
                    icon="ph-plus"
                    variant="text"
                    size="small"
                    title="New note"
                    density="compact"
                    @click.stop="store.openCreateNoteDialog(folder.id)"
                    />
                </template>
            </v-tooltip>
            <div class="d-flex align-center mr-1">
                <v-menu>
                    <template v-slot:activator="{ props }">
                        <v-tooltip text="More" location="top">
                            <template v-slot:activator="{ props: tooltipProps }">
                                <v-btn
                                v-bind="{ ...props, ...tooltipProps }"
                                icon="ph-dots-three"
                                size="small"
                                variant="text"
                                density="compact"
                                />
                            </template>
                        </v-tooltip>
                    </template>
                    <v-list density="compact" rounded="lg" class="pl-1 pr-1 pt-2 pb-2">
                        <v-list-item @click="store.openRenameFolderDialog(folder.id, folder.name)" rounded="lg">
                            <template v-slot:append>
                                <v-icon icon="ph-pencil-line"></v-icon>
                            </template>
                            <v-list-item-title>Rename</v-list-item-title>
                        </v-list-item>
                        <v-list-item @click="store.openDeleteFolderConfirmationDialog(folder.id)" rounded="lg">
                            <template v-slot:append>
                                <v-icon icon="ph-trash"></v-icon>
                            </template>
                            <v-list-item-title>Delete</v-list-item-title>
                        </v-list-item>
                    </v-list>
                </v-menu>
            </div>
        </div>
    </template>
    <v-list-item-title>{{ folder.name }}</v-list-item-title>
</v-list-item>
</template>
<v-list-item
v-for="(note, k) in folder.notes"
:key="k"
:draggable="true"
class="pr-1"
:class="{ 'dragging-note': draggingNoteId === note.id }"
:active="note.id === activeNoteId"
@click="store.openNote(note.id, router)"
@dragstart="handleNoteDragStart(note.id, folder.id, $event)"
@dragend="handleNoteDragEnd"
>
<template v-slot:prepend>
    <v-icon :icon="note.id === activeNoteId ? 'ph-file-text-fill' : 'ph-file-text'" />
</template>
<template v-slot:title>
    <span :class="{ 'font-weight-bold': note.id === activeNoteId }">{{ note.title }}</span>
</template>
<template v-slot:append>
    <v-menu>
        <template v-slot:activator="{ props }">
            <v-tooltip text="More" location="top">
                <template v-slot:activator="{ props: tooltipProps }">
                    <v-btn
                    v-bind="{ ...props, ...tooltipProps }"
                    icon="ph-dots-three"
                    size="small"
                    variant="text"
                    density="compact"
                    />
                </template>
            </v-tooltip>
        </template>
        <v-list density="compact" rounded="lg" class="pl-1 pr-1 pt-2 pb-2">
            <v-list-item @click="store.toggleNoteFavorite(note.id)" rounded="lg">
                <template v-slot:append>
                    <v-icon :icon="note.favorite == 1 ? 'ph-heart-break' : 'ph-heart'"></v-icon>
                </template>
                <v-list-item-title>{{ note.favorite == 1 ? 'Unfavorite' : 'Favorite' }}</v-list-item-title>
            </v-list-item>
            <v-list-item @click="store.openRenameNoteDialog(note.id, note.title)" rounded="lg">
                <template v-slot:append>
                    <v-icon icon="ph-pencil-line"></v-icon>
                </template>
                <v-list-item-title>Rename</v-list-item-title>
            </v-list-item>
            <v-list-item @click="store.openMoveNoteDialog(note.id, folder.id)" rounded="lg">
                <template v-slot:append>
                    <v-icon icon="ph-file-arrow-up"></v-icon>
                </template>
                <v-list-item-title>Move</v-list-item-title>
            </v-list-item>
            <v-list-item @click="store.openDeleteNoteConfirmationDialog(note.id)" rounded="lg">
                <template v-slot:append>
                    <v-icon icon="ph-trash"></v-icon>
                </template>
                <v-list-item-title>Delete</v-list-item-title>
            </v-list-item>
        </v-list>
    </v-menu>
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

<!-- Dialogs -->
<CreateFolderDialog v-model="addFolderDialog" @create-folder="store.createFolder" />
<RenameFolderDialog v-model="renameFolderDialog" :folderId="activeFolderId" :oldFolderName="activeFolderName" @rename-folder="store.renameFolder" />
<ConfirmDeleteFolderDialog v-model="deleteFolderDialog" :confirmationDialogTitle="confirmationDialogTitle" :confirmationDialogText="confirmationDialogText" :confirmationDialogButtonColor="confirmationDialogButtonColor" :folderId="activeFolderId" @delete-folder="store.deleteFolder" />
<CreateNoteDialog v-model="createNoteDialog" :folderId="activeFolderId" @create-note="store.createNote" />
<RenameNoteDialog v-model="renameNoteDialog" :noteId="activeNoteId" :currentNoteTitle="activeNoteTitle" @rename-note="store.renameNote" />
<MoveToFolderDialog v-model="moveToFolderDialog" :folders="folders" :noteId="activeNoteId" :currentFolderId="activeNoteCurrentFolderId" @move-note="store.moveNote" />
<ConfirmDeleteNoteDialog v-model="deleteNoteDialog" :confirmationDialogTitle="confirmationDialogTitle" :confirmationDialogText="confirmationDialogText" :confirmationDialogButtonColor="confirmationDialogButtonColor" :noteId="activeNoteId" @delete-note="store.deleteNote" />
<ErrorDialog v-model="isErrorDialogVisible" :errorDialogText="errorDialogText" :errorDialogTitle="errorDialogTitle" :errorDialogDetails="errorDialogDetails" />
</template>

<script setup>
import CreateFolderDialog from './CreateFolderDialog.vue'
import RenameFolderDialog from './RenameFolderDialog.vue'
import ConfirmDeleteFolderDialog from './ConfirmDeleteFolderDialog.vue'
import CreateNoteDialog from './CreateNoteDialog.vue'
import RenameNoteDialog from './RenameNoteDialog.vue'
import MoveToFolderDialog from './MoveToFolderDialog.vue'
import ConfirmDeleteNoteDialog from './../commons/ConfirmDeleteNoteDialog.vue'
import ErrorDialog from '../commons/ErrorDialog.vue'

import { useRouter } from 'vue-router'
import { useFoldersStore } from '../../stores/foldersStore'
import { computed, onMounted, ref } from 'vue'

// Get the router and the Pinia store instance
const router = useRouter()
const store = useFoldersStore()

// Map store state to local computed refs
const folders = computed(() => store.folders)
const favoriteNotes = computed(() => store.favoriteNotes)

const addFolderDialog = computed({
    get: () => store.addFolderDialog,
    set: (val) => store.addFolderDialog = val
})
const renameFolderDialog = computed({
    get: () => store.renameFolderDialog,
    set: (val) => store.renameFolderDialog = val
})
const deleteFolderDialog = computed({
    get: () => store.deleteFolderDialog,
    set: (val) => store.deleteFolderDialog = val
})
const createNoteDialog = computed({
    get: () => store.createNoteDialog,
    set: (val) => store.createNoteDialog = val
})
const renameNoteDialog = computed({
    get: () => store.renameNoteDialog,
    set: (val) => store.renameNoteDialog = val
})
const moveToFolderDialog = computed({
    get: () => store.moveToFolderDialog,
    set: (val) => store.moveToFolderDialog = val
})
const deleteNoteDialog = computed({
    get: () => store.deleteNoteDialog,
    set: (val) => store.deleteNoteDialog = val
})
const activeFolderId = computed(() => store.activeFolderId)
const activeFolderName = computed(() => store.activeFolderName)
const activeNoteId = computed(() => store.activeNoteId)
const activeNoteTitle = computed(() => store.activeNoteTitle)
const activeNoteCurrentFolderId = computed(() => store.activeNoteCurrentFolderId)
const confirmationDialogTitle = computed(() => store.confirmationDialogTitle)
const confirmationDialogText = computed(() => store.confirmationDialogText)
const confirmationDialogButtonColor = computed(() => store.confirmationDialogButtonColor)
const isErrorDialogVisible = computed(() => store.isErrorDialogVisible)
const errorDialogTitle = computed(() => store.errorDialogTitle)
const errorDialogText = computed(() => store.errorDialogText)
const errorDialogDetails = computed(() => store.errorDialogDetails)
const draggingNoteId = ref(null)
const draggedFromFolderId = ref(null)
const dropTargetFolderId = ref(null)

const resetDragState = () => {
    draggingNoteId.value = null
    draggedFromFolderId.value = null
    dropTargetFolderId.value = null
}

const isValidDropTarget = (folderId) => {
    return draggingNoteId.value !== null && draggedFromFolderId.value !== null && draggedFromFolderId.value !== folderId
}

const handleNoteDragStart = (noteId, folderId, event) => {
    draggingNoteId.value = noteId
    draggedFromFolderId.value = folderId
    dropTargetFolderId.value = null
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.dropEffect = 'move'
        event.dataTransfer.setData('text/plain', String(noteId))
    }
}

const handleNoteDragEnd = () => {
    resetDragState()
}

const handleFolderDragEnter = (folderId) => {
    if (!isValidDropTarget(folderId)) return
    dropTargetFolderId.value = folderId
}

const handleFolderDragOver = (folderId, event) => {
    if (!isValidDropTarget(folderId)) return
    dropTargetFolderId.value = folderId
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move'
    }
}

const handleFolderDrop = async (folderId) => {
    if (!isValidDropTarget(folderId)) {
        resetDragState()
        return
    }
    const noteId = draggingNoteId.value
    const sourceFolderId = draggedFromFolderId.value
    resetDragState()
    await store.moveNote(noteId, folderId, sourceFolderId, { revealTarget: true })
}

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
