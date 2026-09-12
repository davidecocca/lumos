<template>
    <CreateFolderDialog
        v-model="addFolderDialog"
        @create-folder="store.createFolder"
    />
    <RenameFolderDialog
        v-model="renameFolderDialog"
        :folderId="activeFolderId"
        :oldFolderName="activeFolderName"
        @rename-folder="store.renameFolder"
    />
    <ConfirmDeleteFolderDialog
        v-model="deleteFolderDialog"
        :confirmationDialogTitle="confirmationDialogTitle"
        :confirmationDialogText="confirmationDialogText"
        :confirmationDialogButtonColor="confirmationDialogButtonColor"
        :folderId="activeFolderId"
        @delete-folder="store.deleteFolder"
    />
    <CreateNoteDialog
        v-model="createNoteDialog"
        :folderId="activeFolderId"
        :folders="folders"
        :showFolderPicker="createNoteShowFolderPicker"
        @create-note="store.createNote"
    />
    <RenameNoteDialog
        v-model="renameNoteDialog"
        :noteId="actionNoteId"
        :currentNoteTitle="actionNoteTitle"
        @rename-note="store.renameNote"
    />
    <MoveToFolderDialog
        v-model="moveToFolderDialog"
        :folders="folders"
        :noteId="actionNoteId"
        :currentFolderId="actionNoteCurrentFolderId"
        @move-note="store.moveNote"
    />
    <ConfirmDeleteNoteDialog
        v-model="deleteNoteDialog"
        :confirmationDialogTitle="confirmationDialogTitle"
        :confirmationDialogText="confirmationDialogText"
        :confirmationDialogButtonColor="confirmationDialogButtonColor"
        :noteId="actionNoteId"
        @delete-note="store.deleteNote"
    />
    <ErrorDialog
        v-model="isErrorDialogVisible"
        :errorDialogText="errorDialogText"
        :errorDialogTitle="errorDialogTitle"
        :errorDialogDetails="errorDialogDetails"
    />
</template>

<script setup>
import CreateFolderDialog from '../dialogs/CreateFolderDialog.vue';
import RenameFolderDialog from '../dialogs/RenameFolderDialog.vue';
import ConfirmDeleteFolderDialog from '../dialogs/ConfirmDeleteFolderDialog.vue';
import CreateNoteDialog from '../dialogs/CreateNoteDialog.vue';
import RenameNoteDialog from '../dialogs/RenameNoteDialog.vue';
import MoveToFolderDialog from '../dialogs/MoveToFolderDialog.vue';
import ConfirmDeleteNoteDialog from '../dialogs/ConfirmDeleteNoteDialog.vue';
import ErrorDialog from '../../commons/ErrorDialog.vue';

import { computed } from 'vue';
import { useFoldersStore } from '../../../stores/foldersStore';

const store = useFoldersStore();

const folders = computed(() => store.folders);
const addFolderDialog = computed({
    get: () => store.addFolderDialog,
    set: (val) => (store.addFolderDialog = val),
});
const renameFolderDialog = computed({
    get: () => store.renameFolderDialog,
    set: (val) => (store.renameFolderDialog = val),
});
const deleteFolderDialog = computed({
    get: () => store.deleteFolderDialog,
    set: (val) => (store.deleteFolderDialog = val),
});
const createNoteDialog = computed({
    get: () => store.createNoteDialog,
    set: (val) => (store.createNoteDialog = val),
});
const createNoteShowFolderPicker = computed(
    () => store.createNoteShowFolderPicker,
);
const renameNoteDialog = computed({
    get: () => store.renameNoteDialog,
    set: (val) => (store.renameNoteDialog = val),
});
const moveToFolderDialog = computed({
    get: () => store.moveToFolderDialog,
    set: (val) => (store.moveToFolderDialog = val),
});
const deleteNoteDialog = computed({
    get: () => store.deleteNoteDialog,
    set: (val) => (store.deleteNoteDialog = val),
});
const activeFolderId = computed(() => store.activeFolderId);
const activeFolderName = computed(() => store.activeFolderName);
const actionNoteId = computed(() => store.actionNoteId);
const actionNoteTitle = computed(() => store.actionNoteTitle);
const actionNoteCurrentFolderId = computed(
    () => store.actionNoteCurrentFolderId,
);
const confirmationDialogTitle = computed(() => store.confirmationDialogTitle);
const confirmationDialogText = computed(() => store.confirmationDialogText);
const confirmationDialogButtonColor = computed(
    () => store.confirmationDialogButtonColor,
);
const isErrorDialogVisible = computed(() => store.isErrorDialogVisible);
const errorDialogTitle = computed(() => store.errorDialogTitle);
const errorDialogText = computed(() => store.errorDialogText);
const errorDialogDetails = computed(() => store.errorDialogDetails);
</script>
