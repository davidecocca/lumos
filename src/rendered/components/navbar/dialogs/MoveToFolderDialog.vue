<template>
    <v-dialog
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        max-width="520"
    >
        <v-card rounded="xl" elevation="8">
            <v-card-title class="d-flex align-center pt-5 pb-1 px-6">
                <v-avatar color="primary" size="40" variant="tonal" class="mr-3">
                    <v-icon size="24">ph-arrow-right</v-icon>
                </v-avatar>
                <div>
                    <div class="text-headline-small">Move note</div>
                    <div class="text-label-large text-medium-emphasis">Select the destination folder.</div>
                </div>
            </v-card-title>

            <v-card-text class="px-6 pb-4">
                <v-select
                    label="Choose a folder"
                    clearable
                    :items="filteredFolders"
                    item-title="name"
                    item-value="id"
                    v-model="newFolderId"
                    variant="outlined"
                    density="comfortable"
                    @keydown.enter="handleEnter"
                    @click:clear="handleClear"
                />
            </v-card-text>

            <v-divider />
            <v-card-actions class="px-6 py-3">
                <v-spacer />
                <v-btn variant="text" @click="closeDialog()">Cancel</v-btn>
                <v-btn color="primary" variant="tonal" @click="moveNote" :disabled="!newFolderId">Move</v-btn>
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
