<template>
    <v-dialog
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        max-width="520"
    >
        <v-card rounded="xl" elevation="8">
            <v-card-title class="d-flex align-center pt-5 pb-1 px-6">
                <v-avatar color="purple-lighten-5" size="36" class="mr-3">
                    <v-icon size="22" color="purple-darken-2">mdi-note-plus</v-icon>
                </v-avatar>
                <div>
                    <div class="text-h6">New note</div>
                    <div class="text-subtitle-2 text-medium-emphasis">Give your note a title. You can update it later.</div>
                </div>
            </v-card-title>

            <v-card-text class="px-6 pb-4">
                <v-text-field
                    v-model="noteTitle"
                    label="Note title"
                    clearable
                    variant="outlined"
                    @click:clear="handleClear"
                    @keydown.enter="handleEnter"
                />
            </v-card-text>

            <v-divider />
            <v-card-actions class="px-6 py-3">
                <v-spacer />
                <v-btn variant="text" @click="closeDialog()">Close</v-btn>
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

const noteTitle = ref('')

const closeDialog = () => {
    emit('update:modelValue', false)
    noteTitle.value = ''
}

const handleClear = () => {
    noteTitle.value = ''
}

const saveNote = () => {
    if (noteTitle.value.trim()) {
        emit('create-note', props.folderId, noteTitle.value.trim())
        noteTitle.value = ''
    }
}

const handleEnter = () => {
    if (noteTitle.value.trim()) {
        saveNote()
    }
}
</script>