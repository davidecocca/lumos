<template>
    <BaseDialog
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        title="Rename folder"
        subtitle="Enter a new name for the folder."
        icon="ph-pencil-simple-line"
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
            <v-btn variant="text" @click="closeDialog()">Close</v-btn>
            <v-btn color="primary" variant="tonal" @click="renameFolder" :disabled="!folderName.trim()">Save</v-btn>
        </template>
    </BaseDialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import BaseDialog from '../../commons/BaseDialog.vue'

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    folderId: {
        type: Number,
        mandatory: true
    },
    oldFolderName: {
        type: String,
        mandatory: true
    }
})

const folderName = ref(props.oldFolderName)

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

watch(() => props.oldFolderName, (newVal) => {
    folderName.value = newVal
})
</script>
