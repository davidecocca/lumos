<template>
    <v-dialog
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        max-width="520"
    >
        <v-card rounded="xl" elevation="8">
            <v-card-title class="d-flex align-center pt-5 pb-1 px-6">
                <v-avatar color="teal-lighten-5" size="36" class="mr-3">
                    <v-icon size="22" color="teal-darken-2">mdi-file-move</v-icon>
                </v-avatar>
                <div>
                    <div class="text-h6">Move note to</div>
                    <div class="text-subtitle-2 text-medium-emphasis">Select a folder to move the note to.</div>
                </div>
            </v-card-title>

            <v-card-text class="px-6 pb-4">
                <v-select
                    label="Select"
                    clearable
                    :items="filteredFolders"
                    item-title="name"
                    item-value="id"
                    v-model="newFolderId"
                    variant="outlined"
                    @keydown.enter="handleEnter"
                    @click:clear="handleClear"
                />
            </v-card-text>

            <v-divider />
            <v-card-actions class="px-6 py-3">
                <v-spacer />
                <v-btn variant="text" @click="closeDialog()">Close</v-btn>
                <v-btn color="primary" variant="tonal" @click="moveNote" :disabled="!newFolderId">Save</v-btn>
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