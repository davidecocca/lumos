<template>
    <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:isErrorAlertVisible', $event)"
    persistent
    max-width="500"
    >
    <v-card>
        <v-card-title class="text-h6 d-flex align-center mt-2">
            <v-icon class="mr-2" icon="mdi-alert-circle" color="error" />
            {{ errorDialogTitle }}
        </v-card-title>
        <v-card-text>
            {{ errorDialogText }}
            <v-expand-transition>
                <div v-if="showErrorDetails" class="mt-2 detail-log">
                    {{ errorDialogDetails }}
                </div>
            </v-expand-transition>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn text @click="toggleErrorDetails">
                {{ showErrorDetails ? 'Hide Log' : 'Show Log' }}
            </v-btn>
            <v-btn @click="closeDialog" color="primary" variant="tonal">
                Close
            </v-btn>
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
    },
    errorDialogText: {
        type: String,
        default: ''
    },
    errorDialogTitle: {
        type: String,
        default: ''
    },
    errorDialogDetails: {
        type: String,
        default: ''
    }
})

const emit = defineEmits(['update:modelValue'])

const showErrorDetails = ref(false)

const closeDialog = () => {
    emit('update:modelValue', false)
    showErrorDetails.value = false
}

const toggleErrorDetails = () => {
    showErrorDetails.value = !showErrorDetails.value
}
</script>

<style scoped>
.detail-log {
    white-space: pre-wrap;
    font-size: 0.8rem;
    color: gray;
}
</style>