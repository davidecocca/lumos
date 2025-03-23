<template>
    <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="500"
    >
    
    <v-card
    prepend-icon="mdi-file-edit"
    title="Rename note"
    subtitle="Enter a new title for the note."
    >
    <v-card-text>
        <v-text-field
        v-model="noteTitle"
        label="Note title"
        clearable
        @click:clear="handleClear"
        @keydown.enter="handleEnter"
        ></v-text-field>
    </v-card-text>
    
    <v-divider></v-divider>
    
    <v-card-actions>
        <v-spacer></v-spacer>
        
        <v-btn
        text="Close"
        @click="closeDialog()"
        ></v-btn>
        
        <v-btn
        color="primary"
        text="Save"
        variant="tonal"
        @click="renameNote"
        :disabled="!noteTitle.trim()"
        ></v-btn>
    </v-card-actions>
</v-card>
</v-dialog>
</template>

<script setup>
import { ref } from 'vue'

const noteTitle = ref('')

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