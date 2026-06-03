<template>
    <div v-if="note" class="d-flex align-center">
        <div class="d-flex flex-column">
            <v-breadcrumbs :items="breadcrumbsItems">
                <template v-slot:prepend>
                    <v-icon icon="ph-folder" size="small" class="text-medium-emphasis"></v-icon>
                </template>
            </v-breadcrumbs>
        </div>

        <v-spacer></v-spacer>

        <div class="d-flex align-center">
            <v-btn-toggle variant="text" divided multiple :max="0">
                <v-tooltip
                    v-for="button in toolbarButtons"
                    :key="button.value"
                    :text="button.tooltip"
                    location="bottom"
                >
                    <template v-slot:activator="{ props }">
                        <v-btn v-bind="props" @click="button.action">
                            <v-icon>{{ button.icon }}</v-icon>
                        </v-btn>
                    </template>
                </v-tooltip>

                <NoteActionMenu
                    :model-value="noteActionMenu"
                    :note="note"
                    visible
                    button-size="default"
                    button-density="default"
                    button-class="editor-note-action-btn"
                    tooltip-location="bottom"
                    @update:model-value="emit('update:noteActionMenu', $event)"
                    @toggle-favorite="emit('toggle-favorite', $event)"
                    @rename-note="handleRenameNote"
                    @move-note="handleMoveNote"
                    @delete-note="emit('delete-note', $event)"
                />
            </v-btn-toggle>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import NoteActionMenu from '../navbar/menus/NoteActionMenu.vue'

const props = defineProps({
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
})

const emit = defineEmits([
    'update:noteActionMenu',
    'generate-ai',
    'save',
    'toggle-favorite',
    'rename-note',
    'move-note',
    'delete-note',
])

const toolbarButtons = computed(() => [
    {
        value: 'generate-ai',
        tooltip: 'Generate with AI',
        icon: 'ph-lightbulb',
        action: () => emit('generate-ai'),
    },
    {
        value: 'undo',
        tooltip: 'Undo',
        icon: 'ph-arrow-counter-clockwise',
        action: () => props.editor?.chain().focus().undo().run(),
    },
    {
        value: 'redo',
        tooltip: 'Redo',
        icon: 'ph-arrow-clockwise',
        action: () => props.editor?.chain().focus().redo().run(),
    },
    {
        value: 'save',
        tooltip: 'Save',
        icon: 'ph-floppy-disk',
        action: () => emit('save'),
    },
])

const handleRenameNote = (noteId, title) => {
    emit('rename-note', noteId, title)
}

const handleMoveNote = (noteId, currentFolderId) => {
    emit('move-note', noteId, currentFolderId)
}
</script>

<style scoped>
:deep(.editor-note-action-btn.v-btn) {
    width: 64px;
    min-width: 64px;
}
</style>
