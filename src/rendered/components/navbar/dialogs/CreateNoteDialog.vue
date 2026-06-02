<template>
    <v-dialog
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        max-width="520"
    >
        <v-card rounded="xl" elevation="8">
            <v-card-title class="d-flex align-center pt-5 pb-1 px-6">
                <v-avatar color="primary" size="40" variant="tonal" class="mr-3">
                    <v-icon size="24">ph-plus</v-icon>
                </v-avatar>
                <div>
                    <div class="text-headline-small">New note</div>
                    <div class="text-label-large text-medium-emphasis">Add a title. You can change it later.</div>
                </div>
            </v-card-title>

            <v-card-text class="px-6 pb-4">
                <v-text-field
                    v-model="noteTitle"
                    label="Note title"
                    clearable
                    variant="outlined"
                    density="comfortable"
                    @click:clear="handleClear"
                    @keydown.enter="handleEnter"
                />
            </v-card-text>

            <v-divider />
            <v-card-actions class="px-6 py-3">
                <v-spacer />
                <v-btn variant="text" @click="closeDialog()">Cancel</v-btn>
                <v-btn color="primary" variant="tonal" @click="saveNote" :disabled="!noteTitle.trim()">Create</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { ref } from 'vue'

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
