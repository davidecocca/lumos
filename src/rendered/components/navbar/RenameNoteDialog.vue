<template>
    <v-dialog
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        max-width="520"
    >
        <v-card rounded="xl" elevation="8">
            <v-card-title class="d-flex align-center pt-5 pb-1 px-6">
                <v-avatar color="deep-purple-lighten-5" size="36" class="mr-3">
                    <v-icon size="22" color="deep-purple-darken-2">mdi-file-edit</v-icon>
                </v-avatar>
                <div>
                    <div class="text-h6">Rename note</div>
                    <div class="text-subtitle-2 text-medium-emphasis">Enter a new title for the note.</div>
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
                <v-btn color="primary" variant="tonal" @click="renameNote" :disabled="!noteTitle.trim()">Save</v-btn>
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
    noteId: {
        type: Number,
        mandatory: true
    },
    currentNoteTitle: {
        type: String,
        mandatory: true
    }
})

const noteTitle = ref(props.currentNoteTitle)

const emit = defineEmits(['update:modelValue', 'rename-note'])

const closeDialog = () => {
    emit('update:modelValue', false)
}

const handleClear = () => {
    noteTitle.value = ''
}

const renameNote = () => {
    if (noteTitle.value.trim()) {
        emit('rename-note', props.noteId, noteTitle.value.trim())
    }
}

const handleEnter = () => {
    if (noteTitle.value.trim()) {
        renameNote()
    }
}
</script>