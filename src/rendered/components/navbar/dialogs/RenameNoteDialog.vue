<template>
    <BaseDialog
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        title="Rename note"
        subtitle="Enter a new title for the note."
        icon="ph-pencil-simple-line"
    >
        <v-text-field
            v-model="noteTitle"
            label="Note title"
            clearable
            variant="outlined"
            density="comfortable"
            @click:clear="handleClear"
            @keydown.enter="handleEnter"
        />

        <template #actions>
            <v-spacer />
            <v-btn variant="text" @click="closeDialog()">Close</v-btn>
            <v-btn
                color="primary"
                variant="tonal"
                @click="renameNote"
                :disabled="!noteTitle.trim()"
                >Save</v-btn
            >
        </template>
    </BaseDialog>
</template>

<script setup>
import { ref } from 'vue';
import BaseDialog from '../../commons/BaseDialog.vue';

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false,
    },
    noteId: {
        type: Number,
        mandatory: true,
    },
    currentNoteTitle: {
        type: String,
        mandatory: true,
    },
});

const noteTitle = ref(props.currentNoteTitle);

const emit = defineEmits(['update:modelValue', 'rename-note']);

const closeDialog = () => {
    emit('update:modelValue', false);
};

const handleClear = () => {
    noteTitle.value = '';
};

const renameNote = () => {
    if (noteTitle.value.trim()) {
        emit('rename-note', props.noteId, noteTitle.value.trim());
    }
};

const handleEnter = () => {
    if (noteTitle.value.trim()) {
        renameNote();
    }
};
</script>
