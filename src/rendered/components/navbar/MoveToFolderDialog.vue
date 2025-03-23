<template>
    <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="500"
    >
    
    <v-card
    prepend-icon="mdi-file-move"
    title="Move note to"
    subtitle="Select a folder to move the note to."
    >
    <v-card-text>
        <v-select
        label="Select"
        clearable
        :items="filteredFolders"
        item-title="name"
        item-value="id"
        v-model="newFolderId"
        @keydown.enter="handleEnter"
        @click:clear="handleClear"
        ></v-select>
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
        @click="moveNote"
        :disabled="!newFolderId"
        ></v-btn>
    </v-card-actions>
</v-card>
</v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    folders: {
        type: Array,
        mandatory: true,
        default: () => []
    },
    noteId: {
        type: Number,
        mandatory: true,
    },
    currentFolderId: {
        type: Number,
        mandatory: true,
    }
})

const emit = defineEmits(['update:modelValue', 'move-note'])

const newFolderId = ref(null)

const filteredFolders = computed(() => {
    // Exclude the folder where the note is currently placed
    return props.folders.filter(folder => folder.id !== props.currentFolderId)
})

const closeDialog = () => {
    emit('update:modelValue', false)
}
const moveNote = () => {
    if (newFolderId.value) {
        emit('move-note', props.noteId, newFolderId.value)
        newFolderId.value = null
        closeDialog()
    }
}

const handleEnter = () => {
    if (newFolderId.value) {
        moveNote()
    }
}

const handleClear = () => {
    newFolderId.value = null
}
</script>