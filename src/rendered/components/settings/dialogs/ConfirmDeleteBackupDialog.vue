<template>
    <BaseDialog
        :model-value="modelValue"
        title="Delete backup"
        icon="ph-trash"
        icon-color="error"
        :persistent="deleting"
        @update:model-value="$emit('update:modelValue', $event)"
    >
        <p v-if="showBackup" class="text-body-2 text-medium-emphasis mb-4">
            {{ backupLabel }} ·
            {{ backupDate }}
        </p>
        This backup will be permanently deleted. This action cannot be undone.
        <v-alert
            v-if="error"
            type="error"
            variant="tonal"
            density="compact"
            class="mt-2"
            rounded="lg"
            icon-size="20"
        >
            {{ error }}
        </v-alert>
        <template #actions>
            <v-spacer />
            <v-btn
                variant="text"
                :disabled="deleting"
                @click="$emit('update:modelValue', false)"
            >
                Cancel
            </v-btn>
            <v-btn
                color="error"
                variant="tonal"
                :loading="deleting"
                @click="$emit('delete')"
            >
                Delete
            </v-btn>
        </template>
    </BaseDialog>
</template>

<script setup>
import BaseDialog from '../../commons/BaseDialog.vue';

defineProps({
    modelValue: {
        type: Boolean,
        default: false,
    },
    showBackup: {
        type: Boolean,
        default: false,
    },
    backupLabel: {
        type: String,
        default: '',
    },
    backupDate: {
        type: String,
        default: '',
    },
    deleting: {
        type: Boolean,
        default: false,
    },
    error: {
        type: String,
        default: '',
    },
});

defineEmits(['update:modelValue', 'delete']);
</script>
