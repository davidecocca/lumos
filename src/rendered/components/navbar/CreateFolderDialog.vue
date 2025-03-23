<template>
    <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="500"
    >
    
    <v-card
    prepend-icon="mdi-folder-plus"
    title="New folder"
    subtitle="Keep your notes organized by creating a folder."
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
        @click="saveFolder"
        :disabled="!folderName.trim()"
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
    }
})

const emit = defineEmits(['update:modelValue', 'create-folder'])

const folderName = ref('')

const closeDialog = () => {
    emit('update:modelValue', false)
    folderName.value = ''
}

const handleClear = () => {
    folderName.value = ''
}

const saveFolder = () => {
    if (folderName.value.trim()) {
        emit('create-folder', folderName.value.trim())
        folderName.value = ''
    }
}

const handleEnter = () => {
    if (folderName.value.trim()) {
        saveFolder()
    }
}
</script>