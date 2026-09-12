<template>
    <BaseDialog
        :model-value="modelValue"
        title="Restore backup"
        icon="ph-arrow-counter-clockwise"
        icon-color="error"
        :persistent="restoring"
        @update:model-value="$emit('update:modelValue', $event)"
    >
        <p
            v-if="showBackup"
            class="text-body-2 text-medium-emphasis text-break mb-4"
        >
            <template v-if="backupDate">
                {{ backupLabel }} ·
                {{ backupDate }}
            </template>
            <template v-else>{{ backupPath }}</template>
        </p>
        Before restoring, Lumos will create a safety backup. Your current notes and images
        will then be replaced, semantic search rebuilt, and the app restarted.
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
                :disabled="restoring"
                @click="$emit('update:modelValue', false)"
            >
                Cancel
            </v-btn>
            <v-btn
                color="error"
                variant="tonal"
                :loading="restoring"
                @click="$emit('restore')"
            >
                Restore and restart
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
    backupPath: {
        type: String,
        default: '',
    },
    restoring: {
        type: Boolean,
        default: false,
    },
    error: {
        type: String,
        default: '',
    },
});

defineEmits(['update:modelValue', 'restore']);
</script>
