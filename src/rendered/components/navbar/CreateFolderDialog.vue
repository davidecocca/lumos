<template>
    <v-dialog
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        max-width="520"
    >
        <v-card rounded="xl" elevation="8">
            <v-card-title class="d-flex align-center pt-5 pb-1 px-6">
                <v-avatar color="blue-lighten-5" size="36" class="mr-3">
                    <v-icon size="22" color="blue-darken-2">mdi-folder-plus</v-icon>
                </v-avatar>
                <div>
                    <div class="text-h6">New folder</div>
                    <div class="text-subtitle-2 text-medium-emphasis">Keep your notes organized by creating a folder.</div>
                </div>
            </v-card-title>

            <v-card-text class="px-6 pb-4">
                <v-text-field
                    v-model="folderName"
                    label="Folder name"
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
                <v-btn color="primary" variant="tonal" @click="saveFolder" :disabled="!folderName.trim()">Save</v-btn>
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