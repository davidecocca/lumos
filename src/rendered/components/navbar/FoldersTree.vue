<template>
    <!-- Favorites notes section -->
    <v-list v-if="favoriteNotes.length > 0">
        <!-- Favorite notes header -->
        <div class="d-flex align-center mr-1">
            <v-list-subheader class="flex-grow-1">Favorites</v-list-subheader>
        </div>
        
        <!-- Favorite notes list -->
        <v-list-item
        v-for="(note, k) in favoriteNotes"
        :key="k"
        :title="note.title"
        prepend-icon="mdi-file-document-outline"
        @click="store.openNote(note.id, router)"
        class="pr-1"
        >
        <template v-slot:append>
            <!-- Note action menu -->
            <v-menu>
                <template v-slot:activator="{ props }">
                    <v-tooltip text="More" location="top">
                        <template v-slot:activator="{ props: tooltipProps }">
                            <v-btn v-bind="{ ...props, ...tooltipProps }" icon="mdi-dots-horizontal" size="small" variant="text"></v-btn>
                        </template>
                    </v-tooltip>
                </template>
                <v-list density="compact">
                    <v-list-item @click="store.toggleNoteFavorite(note.id)">
                        <template v-slot:append>
                            <v-icon icon="mdi-heart-broken"></v-icon>
                        </template>
                        <v-list-item-title>Unfavorite</v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="store.openRenameNoteDialog(note.id, note.title)">
                        <template v-slot:append>
                            <v-icon icon="mdi-rename"></v-icon>
                        </template>
                        <v-list-item-title>Rename</v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="store.openDeleteNoteConfirmationDialog(note.id)">
                        <template v-slot:append>
                            <v-icon icon="mdi-delete"></v-icon>
                        </template>
                        <v-list-item-title>Delete</v-list-item-title>
                    </v-list-item>
                </v-list>
            </v-menu>
        </template>
    </v-list-item>
</v-list>

<!-- List of folders and notes -->
<v-list>
    <!-- Notes header -->
    <div class="d-flex align-center mr-1">
        <v-list-subheader class="flex-grow-1">Notes</v-list-subheader>
    </div>
    <v-list-group v-for="folder in folders" :key="folder.id" :prepend-icon="folder.isOpen ? 'mdi-folder-open-outline' : 'mdi-folder-outline'" class="notes-indent-tight">
        <template v-slot:activator="{ props, isOpen }">
            <v-list-item v-bind="props" class="pe-0" @click="store.toggleFolderOpen(folder)">
                <template v-slot:append>
                    <div v-if="folder.loading" class="mr-2">
                        <v-progress-circular size="20" indeterminate></v-progress-circular>
                    </div>
                    <v-tooltip text="New note" location="top">
                        <template v-slot:activator="{ props }">
                            <v-btn v-bind="props" icon="mdi-plus" variant="text" size="small" @click.stop="store.openCreateNoteDialog(folder.id)" title="New note"></v-btn>
                        </template>
                    </v-tooltip>
                    <div class="d-flex align-center mr-1">
                        <v-menu>
                            <template v-slot:activator="{ props }">
                                <v-tooltip text="More" location="top">
                                    <template v-slot:activator="{ props: tooltipProps }">
                                        <v-btn v-bind="{ ...props, ...tooltipProps }" icon="mdi-dots-horizontal" size="small" variant="text"></v-btn>
                                    </template>
                                </v-tooltip>
                            </template>
                            <v-list density="compact">
                                <v-list-item @click="store.openRenameFolderDialog(folder.id, folder.name)">
                                    <template v-slot:append>
                                        <v-icon icon="mdi-rename"></v-icon>
                                    </template>
                                    <v-list-item-title>Rename</v-list-item-title>
                                </v-list-item>
                                <v-list-item @click="store.openDeleteFolderConfirmationDialog(folder.id)">
                                    <template v-slot:append>
                                        <v-icon icon="mdi-delete"></v-icon>
                                    </template>
                                    <v-list-item-title>Delete</v-list-item-title>
                                </v-list-item>
                            </v-list>
                        </v-menu>
                    </div>
                </template>
                <v-list-item-title>{{ folder.name }}</v-list-item-title>
            </v-list-item>
        </template>
        <v-list-item v-for="(note, k) in folder.notes" :key="k" :title="note.title" prepend-icon="mdi-file-document-outline" @click="store.openNote(note.id, router)" class="pr-1">
            <template v-slot:append>
                <v-menu>
                    <template v-slot:activator="{ props }">
                        <v-tooltip text="More" location="top">
                            <template v-slot:activator="{ props: tooltipProps }">
                                <v-btn v-bind="{ ...props, ...tooltipProps }" icon="mdi-dots-horizontal" size="small" variant="text"></v-btn>
                            </template>
                        </v-tooltip>
                    </template>
                    <v-list density="compact">
                        <v-list-item @click="store.toggleNoteFavorite(note.id)">
                            <template v-slot:append>
                                <v-icon :icon="note.favorite == 1 ? 'mdi-heart-broken' : 'mdi-heart'"></v-icon>
                            </template>
                            <v-list-item-title>{{ note.favorite == 1 ? 'Unfavorite' : 'Favorite' }}</v-list-item-title>
                        </v-list-item>
                        <v-list-item @click="store.openRenameNoteDialog(note.id, note.title)">
                            <template v-slot:append>
                                <v-icon icon="mdi-rename"></v-icon>
                            </template>
                            <v-list-item-title>Rename</v-list-item-title>
                        </v-list-item>
                        <v-list-item @click="store.openMoveNoteDialog(note.id, folder.id)">
                            <template v-slot:append>
                                <v-icon icon="mdi-file-move"></v-icon>
                            </template>
                            <v-list-item-title>Move</v-list-item-title>
                        </v-list-item>
                        <v-list-item @click="store.openDeleteNoteConfirmationDialog(note.id)">
                            <template v-slot:append>
                                <v-icon icon="mdi-delete"></v-icon>
                            </template>
                            <v-list-item-title>Delete</v-list-item-title>
                        </v-list-item>
                    </v-list>
                </v-menu>
            </template>
        </v-list-item>
        <v-list-item v-if="folder.notes.length === 0" prepend-icon="mdi-package-variant">
            <v-list-item-subtitle>No notes in this folder.</v-list-item-subtitle>
        </v-list-item>
    </v-list-group>
    <v-list-item v-if="folders.length === 0" prepend-icon="mdi-package-variant">
        <v-list-item-subtitle>No folders.</v-list-item-subtitle>
        <v-list-item-subtitle>Create a new folder to get started!</v-list-item-subtitle>
    </v-list-item>
</v-list>

<v-tooltip text="New folder" location="top">
    <template v-slot:activator="{ props }">
        <v-btn
        v-bind="props"
        @click="addFolderDialog = true"
        class="ma-4"
        color="primary"
        icon="mdi-folder-plus"
        size="large"
        style="position: fixed; bottom: 16px; right: 16px;"
        elevation="4"
        @onclick.stop="store.openCreateFolderDialog()"
        ></v-btn>
    </template>
</v-tooltip>

<!-- Dialogs (components remain the same) -->
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
import { computed, onMounted } from 'vue'

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

onMounted(async () => {
    // Lazy load folders; only fetch notes when a folder is expanded.
    await store.fetchFolders()
    // Also fetch favorite notes so they’re available from the start.
    await store.fetchFavoriteNotes()
})
</script>

<style scoped>
/* Reduce the left indentation of notes inside folders */
.notes-indent-tight :deep(.v-list-group__items) {
    padding-left: 32px !important;
}

/* Reduce the prepend icon margin if needed */
/* .notes-indent-tight :deep(.v-list-group__items .v-list-item__prepend) {
margin-left: 0px;
margin-right: 0px;
} */

/* Remove any additional left padding from the list items themselves */
.notes-indent-tight :deep(.v-list-group__items .v-list-item) {
    padding-left: 0px !important;
}
</style>