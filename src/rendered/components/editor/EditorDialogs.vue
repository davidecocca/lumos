<template>
    <div v-if="note">
        <RenameNoteDialog
            :model-value="renameNoteDialog"
            :noteId="note.id"
            :currentNoteTitle="note.title"
            @update:model-value="emit('update:renameNoteDialog', $event)"
            @rename-note="handleRenameNote"
        />

        <MoveToFolderDialog
            :model-value="moveToFolderDialog"
            :noteId="note.id"
            :currentFolderId="note.folder_id"
            :currentFolderName="note.folderName"
            :folders="folders"
            @update:model-value="emit('update:moveToFolderDialog', $event)"
            @move-note="handleMoveNote"
        />

        <ConfirmDeleteNoteDialog
            :model-value="deleteNoteDialog"
            :confirmationDialogTitle="confirmationDialogTitle"
            :confirmationDialogText="confirmationDialogText"
            :confirmationDialogButtonColor="confirmationDialogButtonColor"
            :noteId="note.id"
            @update:model-value="emit('update:deleteNoteDialog', $event)"
            @delete-note="emit('delete-note', $event)"
        />

        <EmbedYoutubeDialog
            :model-value="embedYoutubeDialog"
            @update:model-value="emit('update:embedYoutubeDialog', $event)"
            @embed="emit('embed-youtube', $event)"
        />
    </div>
</template>

<script setup>
import RenameNoteDialog from '../navbar/dialogs/RenameNoteDialog.vue'
import MoveToFolderDialog from '../navbar/dialogs/MoveToFolderDialog.vue'
import ConfirmDeleteNoteDialog from '../navbar/dialogs/ConfirmDeleteNoteDialog.vue'
import EmbedYoutubeDialog from './dialogs/EmbedYoutubeDialog.vue'

defineProps({
    note: {
        type: Object,
        default: null,
    },
    folders: {
        type: Array,
        default: () => [],
    },
    renameNoteDialog: {
        type: Boolean,
        default: false,
    },
    moveToFolderDialog: {
        type: Boolean,
        default: false,
    },
    deleteNoteDialog: {
        type: Boolean,
        default: false,
    },
    embedYoutubeDialog: {
        type: Boolean,
        default: false,
    },
    confirmationDialogTitle: {
        type: String,
        default: '',
    },
    confirmationDialogText: {
        type: String,
        default: '',
    },
    confirmationDialogButtonColor: {
        type: String,
        default: 'primary',
    },
})

const emit = defineEmits([
    'update:renameNoteDialog',
    'update:moveToFolderDialog',
    'update:deleteNoteDialog',
    'update:embedYoutubeDialog',
    'rename-note',
    'move-note',
    'delete-note',
    'embed-youtube',
])

const handleRenameNote = (noteId, title) => {
    emit('rename-note', noteId, title)
}

const handleMoveNote = (noteId, newFolderId) => {
    emit('move-note', noteId, newFolderId)
}
</script>
