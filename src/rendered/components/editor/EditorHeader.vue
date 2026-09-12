<template>
    <div v-if="note" class="d-flex align-center py-1 pr-4">
        <div class="d-flex align-center">
            <v-breadcrumbs
                :items="breadcrumbsItems"
                class="editor-breadcrumbs ma-0 py-0"
            >
                <template v-slot:prepend>
                    <v-icon
                        icon="ph-folder-simple"
                        size="x-small"
                        class="text-medium-emphasis"
                    ></v-icon>
                </template>
            </v-breadcrumbs>
            <EditorSaveStatus
                :saving="autoSave.saving"
                :saved-at="autoSave.savedAt"
                class="ml-1"
            />
        </div>

        <v-spacer></v-spacer>

        <div class="d-flex align-center ga-1">
            <v-tooltip
                v-if="!isChatOpen"
                :text="`Chat with this note (${formatShortcut('⌘L')})`"
                location="bottom"
            >
                <template v-slot:activator="{ props }">
                    <v-btn
                        v-bind="props"
                        icon="ph-chat-circle"
                        aria-label="Chat with this note"
                        variant="text"
                        rounded="lg"
                        density="comfortable"
                        @click="emit('chat')"
                    ></v-btn>
                </template>
            </v-tooltip>

            <NoteActionMenu
                :model-value="noteActionMenu"
                :note="note"
                :editor-actions="true"
                visible
                button-size="default"
                button-density="comfortable"
                tooltip-location="bottom"
                @update:model-value="emit('update:noteActionMenu', $event)"
                @toggle-favorite="emit('toggle-favorite', $event)"
                @rename-note="handleRenameNote"
                @move-note="handleMoveNote"
                @delete-note="emit('delete-note', $event)"
                @save="emit('save')"
                @undo="handleUndo"
                @redo="handleRedo"
                @export-note="emit('export-note', $event)"
            />
        </div>
    </div>
</template>

<script setup>
import EditorSaveStatus from './EditorSaveStatus.vue';
import NoteActionMenu from '../navbar/menus/NoteActionMenu.vue';
import { formatShortcut } from '../../utils/shortcuts';

const props = defineProps({
    isChatOpen: {
        type: Boolean,
        default: false,
    },
    note: {
        type: Object,
        default: null,
    },
    breadcrumbsItems: {
        type: Array,
        default: () => [],
    },
    editor: {
        type: Object,
        default: null,
    },
    noteActionMenu: {
        type: Boolean,
        default: false,
    },
    autoSave: {
        type: Object,
        default: () => ({ dirty: false, saving: false, savedAt: null }),
    },
});

const emit = defineEmits([
    'update:noteActionMenu',
    'chat',
    'save',
    'toggle-favorite',
    'rename-note',
    'move-note',
    'delete-note',
    'export-note',
]);

const handleRenameNote = (noteId, title) => {
    emit('rename-note', noteId, title);
};

const handleMoveNote = (noteId, currentFolderId) => {
    emit('move-note', noteId, currentFolderId);
};

const handleUndo = () => {
    props.editor?.chain().focus().undo().run();
};

const handleRedo = () => {
    props.editor?.chain().focus().redo().run();
};
</script>

<style scoped>
.v-theme--light .editor-breadcrumbs {
    --v-disabled-opacity: 0.65;
}
</style>
