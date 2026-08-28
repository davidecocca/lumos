<template>
    <BaseDialog
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        title="Move note"
        subtitle="Select the destination folder."
        icon="ph-arrow-right"
    >
        <v-select
            label="Choose a folder"
            clearable
            :items="filteredFolders"
            item-title="name"
            item-value="id"
            v-model="newFolderId"
            variant="outlined"
            density="comfortable"
            @keydown.enter="handleEnter"
            @click:clear="handleClear"
        />

        <template #actions>
            <v-spacer />
            <v-btn variant="text" @click="closeDialog()">Cancel</v-btn>
            <v-btn
                color="primary"
                variant="tonal"
                @click="moveNote"
                :disabled="!newFolderId"
                >Move</v-btn
            >
        </template>
    </BaseDialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import BaseDialog from '../../commons/BaseDialog.vue';

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false,
    },
    folders: {
        type: Array,
        mandatory: true,
        default: () => [],
    },
    noteId: {
        type: Number,
        mandatory: true,
    },
    currentFolderId: {
        type: Number,
        mandatory: true,
    },
});

const emit = defineEmits(['update:modelValue', 'move-note']);

const newFolderId = ref(null);

const filteredFolders = computed(() => {
    // Exclude the folder where the note is currently placed
    return props.folders.filter(
        (folder) => folder.id !== props.currentFolderId,
    );
});

const closeDialog = () => {
    emit('update:modelValue', false);
};
const moveNote = () => {
    if (newFolderId.value) {
        emit('move-note', props.noteId, newFolderId.value);
        newFolderId.value = null;
        closeDialog();
    }
};

const handleEnter = () => {
    if (newFolderId.value) {
        moveNote();
    }
};

const handleClear = () => {
    newFolderId.value = null;
};
</script>
