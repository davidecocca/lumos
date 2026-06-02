<template>
    <v-dialog
        :model-value="modelValue"
        @update:model-value="$emit('update:isConfirmationDialogVisible', $event)"
        max-width="520"
    >
        <v-card rounded="xl" elevation="8">
            <v-card-title class="d-flex align-center pt-5 pb-1 px-6">
                <v-avatar color="error" size="40" variant="tonal" class="mr-3">
                    <v-icon size="24">ph-trash</v-icon>
                </v-avatar>
                <div class="text-headline-small">{{ confirmationDialogTitle }}</div>
            </v-card-title>

            <v-card-text class="px-6 pb-4">
                {{ confirmationDialogText }}
            </v-card-text>

            <v-divider />
            <v-card-actions class="px-6 py-3">
                <v-spacer />
                <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
                <v-btn :color="confirmationDialogButtonColor" variant="tonal" @click="deleteFolder">Delete</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    confirmationDialogTitle: {
        type: String,
        default: ''
    },
    confirmationDialogText: {
        type: String,
        default: ''
    },
    confirmationDialogButtonColor: {
        type: String,
        default: 'primary'
    },
    folderId: {
        type: Number,
        mandatory: true
    }
})

const emit = defineEmits(['update:modelValue', 'delete-folder'])

const folderIdToDelete = ref(null)

watch(() => props.modelValue, (newVal) => {
    if (newVal) {
        folderIdToDelete.value = props.folderId
    }
})

const closeDialog = () => {
    emit('update:modelValue', false)
}

const deleteFolder = () => {
    emit('delete-folder', folderIdToDelete.value)
}
</script>
