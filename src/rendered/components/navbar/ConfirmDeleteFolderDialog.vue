<template>
    <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:isConfirmationDialogVisible', $event)"
    max-width="500"
    >
    <v-card>
        <v-card-title class="text-h6 d-flex align-center mt-2">
            <v-icon class="mr-2" icon="mdi-alert-circle" color="warning" />
            {{ confirmationDialogTitle }}
        </v-card-title>
        <v-card-text>
            {{ confirmationDialogText }}
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn @click="closeDialog">
                No
            </v-btn>
            <v-btn @click="deleteFolder" :color="confirmationDialogButtonColor" variant="tonal">
                Yes
            </v-btn>
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