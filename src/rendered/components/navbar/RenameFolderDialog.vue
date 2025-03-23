<template>
    <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="500"
    >
    
    <v-card
    prepend-icon="mdi-folder-edit"
    title="Rename folder"
    subtitle="Enter a new name for the folder."
    >
    <v-card-text>
        <v-text-field
        v-model="folderName"
        label="Folder name"
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
        @click="renameFolder"
        :disabled="!folderName.trim()"
        ></v-btn>
    </v-card-actions>
</v-card>
</v-dialog>
</template>

<script setup>
import { ref } from 'vue'

// TODO: Set the initial value of folderName to the old folder name
const folderName = ref('')

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    folderId: {
        type: Number,
        mandatory: true
    },
    oldfolderName: {
        type: String,
        mandatory: true
    }
})

const emit = defineEmits(['update:modelValue', 'rename-folder'])

const closeDialog = () => {
    emit('update:modelValue', false)
}

const handleClear = () => {
    folderName.value = ''
}

const renameFolder = () => {
    if (folderName.value.trim()) {
        emit('rename-folder', props.folderId, folderName.value.trim())
    }
}

const handleEnter = () => {
    if (folderName.value.trim()) {
        renameFolder()
    }
}
</script>