<template>
    <v-dialog
        :model-value="modelValue"
        @update:model-value="$emit('update:isConfirmationDialogVisible', $event)"
        max-width="520"
    >
        <v-card rounded="xl" elevation="8">
            <v-card-title class="d-flex align-center pt-5 pb-1 px-6">
                <v-avatar color="amber-lighten-5" size="36" class="mr-3">
                    <v-icon size="22" color="amber-darken-2">mdi-alert-circle</v-icon>
                </v-avatar>
                <div class="text-h6">{{ confirmationDialogTitle }}</div>
            </v-card-title>

            <v-card-text class="px-6 pb-4">
                {{ confirmationDialogText }}
            </v-card-text>

            <v-divider />
            <v-card-actions class="px-6 py-3">
                <v-spacer />
                <v-btn variant="text" @click="closeDialog">No</v-btn>
                <v-btn :color="confirmationDialogButtonColor" variant="tonal" @click="deleteFolder">Yes</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
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

const closeDialog = () => {
    emit('update:modelValue', false)
}

const deleteFolder = () => {
    emit('delete-folder', props.folderId)
}
</script>