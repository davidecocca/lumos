<template>
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
import CreateFolderDialog from '../dialogs/CreateFolderDialog.vue'
import RenameFolderDialog from '../dialogs/RenameFolderDialog.vue'
import ConfirmDeleteFolderDialog from '../dialogs/ConfirmDeleteFolderDialog.vue'
import CreateNoteDialog from '../dialogs/CreateNoteDialog.vue'
import RenameNoteDialog from '../dialogs/RenameNoteDialog.vue'
import MoveToFolderDialog from '../dialogs/MoveToFolderDialog.vue'
import ConfirmDeleteNoteDialog from '../../commons/ConfirmDeleteNoteDialog.vue'
import ErrorDialog from '../../commons/ErrorDialog.vue'

import { computed } from 'vue'
import { useFoldersStore } from '../../../stores/foldersStore'

const store = useFoldersStore()

const folders = computed(() => store.folders)
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
</script>
