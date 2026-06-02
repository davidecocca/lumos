<template>
    <v-dialog
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        max-width="520"
    >
        <v-card rounded="xl" elevation="8">
            <v-card-title class="d-flex align-center pt-5 pb-1 px-6">
                <v-avatar color="primary" size="40" variant="tonal" class="mr-3">
                    <v-icon size="24">ph-folder-simple-plus</v-icon>
                </v-avatar>
                <div>
                    <div class="text-headline-small">New folder</div>
                    <div class="text-label-large text-medium-emphasis">Create a folder to organize your notes.</div>
                </div>
            </v-card-title>

            <v-card-text class="px-6 pb-4">
                <v-text-field
                    v-model="folderName"
                    label="Folder name"
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
                <v-btn color="primary" variant="tonal" @click="saveFolder" :disabled="!folderName.trim()">Create</v-btn>
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
