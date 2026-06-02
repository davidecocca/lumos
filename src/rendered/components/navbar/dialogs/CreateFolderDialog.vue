<template>
    <BaseDialog
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        title="New folder"
        subtitle="Create a folder to organize your notes."
        icon="ph-folder-simple-plus"
    >
        <v-text-field
            v-model="folderName"
            label="Folder name"
            clearable
            variant="outlined"
            density="comfortable"
            @click:clear="handleClear"
            @keydown.enter="handleEnter"
        />

        <template #actions>
            <v-spacer />
            <v-btn variant="text" @click="closeDialog()">Cancel</v-btn>
            <v-btn color="primary" variant="tonal" @click="saveFolder" :disabled="!folderName.trim()">Create</v-btn>
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
    }
})

const emit = defineEmits(['update:modelValue', 'create-folder'])

const folderName = ref('Untitled folder')

const closeDialog = () => {
    emit('update:modelValue', false)
    folderName.value = 'Untitled folder'
}

const handleClear = () => {
    folderName.value = ''
}

const saveFolder = () => {
    if (folderName.value.trim()) {
        emit('create-folder', folderName.value.trim())
        folderName.value = 'Untitled folder'
    }
}

const handleEnter = () => {
    if (folderName.value.trim()) {
        saveFolder()
    }
}
</script>
