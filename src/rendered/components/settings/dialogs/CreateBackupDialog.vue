<template>
    <BaseDialog
        :model-value="modelValue"
        title="New backup"
        subtitle="Save a snapshot of your notes and images."
        icon="ph-database"
        :persistent="creating"
        @update:model-value="$emit('update:modelValue', $event)"
    >
        <v-form id="create-backup-form" @submit.prevent="$emit('submit')">
            <v-text-field
                :model-value="name"
                label="Backup name"
                variant="outlined"
                density="comfortable"
                rounded="lg"
                autofocus
                maxlength="120"
                :disabled="creating"
                hint="No name? Lumos will use the current date and time."
                persistent-hint
                class="mt-2"
                @update:model-value="$emit('update:name', $event)"
            />
        </v-form>
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
                :disabled="creating"
                @click="$emit('update:modelValue', false)"
            >
                Cancel
            </v-btn>
            <v-btn
                color="primary"
                variant="tonal"
                type="submit"
                form="create-backup-form"
                :loading="creating"
            >
                Create backup
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
    name: {
        type: String,
        default: '',
    },
    creating: {
        type: Boolean,
        default: false,
    },
    error: {
        type: String,
        default: '',
    },
});

defineEmits(['update:modelValue', 'update:name', 'submit']);
</script>
