<template>
    <div v-if="note" class="d-flex align-center">
        <div class="d-flex flex-column">
            <v-breadcrumbs :items="breadcrumbsItems">
                <template v-slot:prepend>
                    <v-icon
                        icon="ph-folder"
                        size="small"
                        class="text-medium-emphasis"
                    ></v-icon>
                </template>
            </v-breadcrumbs>
        </div>

        <v-spacer></v-spacer>

        <div class="d-flex align-center">
            <v-tooltip :text="saveStatusTooltip" location="bottom">
                <template v-slot:activator="{ props }">
                    <v-btn
                        v-bind="props"
                        :icon="saveStatusIcon"
                        :loading="isSaveButtonLoading"
                        :disabled="isSaveButtonLoading"
                        variant="text"
                        rounded="lg"
                        @mouseenter="isSaveButtonHovered = true"
                        @mouseleave="isSaveButtonHovered = false"
                        @click="handleSave"
                    ></v-btn>
                </template>
            </v-tooltip>

            <v-tooltip
                :text="`Toggle note chat (${formatShortcut('⌘L')})`"
                location="bottom"
            >
                <template v-slot:activator="{ props }">
                    <v-btn
                        v-bind="props"
                        icon="ph-chat-circle"
                        variant="text"
                        rounded="lg"
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
                button-density="default"
                tooltip-location="bottom"
                @update:model-value="emit('update:noteActionMenu', $event)"
                @toggle-favorite="emit('toggle-favorite', $event)"
                @rename-note="handleRenameNote"
                @move-note="handleMoveNote"
                @delete-note="emit('delete-note', $event)"
                @undo="handleUndo"
                @redo="handleRedo"
            />
        </div>
    </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue';
import NoteActionMenu from '../navbar/menus/NoteActionMenu.vue';
import { formatShortcut } from '../../utils/shortcuts';

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

const isSaving = computed(() => Boolean(props.autoSave?.saving));
const isSaveButtonHovered = ref(false);
const manualSaveRequested = ref(false);

const isSaveButtonLoading = computed(
    () => isSaving.value || manualSaveRequested.value,
);

const handleSave = async () => {
    // Start the spinner immediately, before the parent save handler updates its state.
    manualSaveRequested.value = true;
    emit('save');
    await nextTick();
    manualSaveRequested.value = false;
};

const saveStatusIcon = computed(() =>
    isSaveButtonHovered.value ? 'ph-floppy-disk' : 'ph-check',
);

const saveStatusTooltip = computed(() => {
    if (!props.autoSave?.savedAt) return 'Save';
    const date = new Date(props.autoSave.savedAt);
    const time = date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });
    if (date.toDateString() === new Date().toDateString()) {
        return `Last saved: ${time}`;
    }
    const day = date.toLocaleDateString([], { day: 'numeric', month: 'short' });
    return `Last saved: ${day}, ${time}`;
});
</script>

<style scoped></style>
