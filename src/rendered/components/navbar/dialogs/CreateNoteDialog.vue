<template>
    <BaseDialog
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        title="New note"
        subtitle="Add a title. You can change it later."
        icon="ph-plus"
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
            <v-btn variant="text" @click="closeDialog()">Cancel</v-btn>
            <v-btn color="primary" variant="tonal" @click="saveNote" :disabled="!noteTitle.trim()">Create</v-btn>
        </template>
    </BaseDialog>
</template>

<script setup>
import { ref } from 'vue'
import BaseDialog from '../../commons/BaseDialog.vue'

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    folderId: {
        type: Number,
        mandatory: true,
    },
})

const emit = defineEmits(['update:modelValue', 'create-note'])

const noteTitle = ref('Untitled note')

const closeDialog = () => {
    emit('update:modelValue', false)
    noteTitle.value = 'Untitled note'
}

const handleClear = () => {
    noteTitle.value = ''
}

const saveNote = () => {
    if (noteTitle.value.trim()) {
        emit('create-note', props.folderId, noteTitle.value.trim())
        noteTitle.value = 'Untitled note'
    }
}

const handleEnter = () => {
    if (noteTitle.value.trim()) {
        saveNote()
    }
}
</script>
