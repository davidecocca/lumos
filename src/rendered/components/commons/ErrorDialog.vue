<template>
    <v-dialog
        :model-value="modelValue"
        @update:model-value="$emit('update:isErrorAlertVisible', $event)"
        persistent
        max-width="560"
    >
        <v-card rounded="xl" elevation="8">
            <v-card-title class="d-flex align-center pt-5 pb-1 px-6">
                <v-avatar color="red-lighten-5" size="36" class="mr-3">
                    <v-icon size="22" color="red-darken-2">mdi-alert-circle</v-icon>
                </v-avatar>
                <div class="text-h6">{{ errorDialogTitle }}</div>
            </v-card-title>

            <v-card-text class="px-6 pb-0">
                {{ errorDialogText }}
                <v-expand-transition>
                    <div v-if="showErrorDetails" class="mt-3 detail-log">
                        {{ errorDialogDetails }}
                    </div>
                </v-expand-transition>
            </v-card-text>

            <v-divider class="mt-4" />
            <v-card-actions class="px-6 py-3">
                <v-btn variant="text" @click="toggleErrorDetails">
                    {{ showErrorDetails ? 'Hide Log' : 'Show Log' }}
                </v-btn>
                <v-spacer />
                <v-btn color="primary" variant="tonal" @click="closeDialog">Close</v-btn>
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