<template>
    <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="500"
    >
    
    <v-card
    prepend-icon="mdi-note-plus"
    title="New note"
    subtitle="Give your note a title. You will be able to update it later."
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
        text="Create"
        variant="tonal"
        @click="saveNote"
        :disabled="!noteTitle.trim()"
        ></v-btn>
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