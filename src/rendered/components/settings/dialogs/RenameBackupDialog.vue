<template>
    <BaseDialog
        :model-value="modelValue"
        title="Rename backup"
        icon="ph-pencil-simple"
        :persistent="renaming"
        @update:model-value="$emit('update:modelValue', $event)"
    >
        <v-form id="rename-backup-form" @submit.prevent="$emit('submit')">
            <v-text-field
                :model-value="name"
                label="Backup name"
                variant="outlined"
                density="comfortable"
                rounded="lg"
                autofocus
                maxlength="120"
                :disabled="renaming"
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
                :disabled="renaming"
                @click="$emit('update:modelValue', false)"
            >
                Cancel
            </v-btn>
            <v-btn
                color="primary"
                variant="tonal"
                type="submit"
                form="rename-backup-form"
                :loading="renaming"
            >
                Rename backup
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
    renaming: {
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
