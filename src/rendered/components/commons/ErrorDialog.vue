<template>
    <BaseDialog
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        persistent
        max-width="560"
        :title="errorDialogTitle"
        icon="ph-warning-circle"
        icon-color="error"
        content-class="px-6 pb-4"
    >
        {{ errorDialogText }}
        <v-expand-transition>
            <div v-if="showErrorDetails" class="mt-3 detail-log">
                {{ errorDialogDetails }}
            </div>
        </v-expand-transition>

        <template #actions>
            <v-btn variant="text" @click="toggleErrorDetails">
                {{ showErrorDetails ? 'Hide Log' : 'Show Log' }}
            </v-btn>
            <v-spacer />
            <v-btn color="primary" variant="tonal" @click="closeDialog">Close</v-btn>
        </template>
    </BaseDialog>
</template>

<script setup>
import { ref } from 'vue'
import BaseDialog from './BaseDialog.vue'

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
