<template>
    <BaseDialog
        v-model="open"
        title="Add a link"
        icon="ph-link"
        :max-width="480"
    >
        <v-form id="kanban-link-form" @submit.prevent="emit('apply')">
            <v-text-field
                v-model="url"
                label="URL"
                placeholder="https://example.com"
                variant="outlined"
                density="comfortable"
                rounded="lg"
                autofocus
                :disabled="disabled"
                :error-messages="error"
            />
        </v-form>
        <template #actions>
            <v-btn
                v-if="editing"
                variant="text"
                color="error"
                :disabled="disabled"
                @click="emit('remove')"
                >Remove link</v-btn
            >
            <v-spacer />
            <v-btn variant="text" @click="open = false">Cancel</v-btn>
            <v-btn
                type="submit"
                form="kanban-link-form"
                variant="tonal"
                color="primary"
                :disabled="disabled || !url.trim()"
                >Apply</v-btn
            >
        </template>
    </BaseDialog>
</template>

<script setup>
import BaseDialog from '../../commons/BaseDialog.vue';

const open = defineModel({ type: Boolean, default: false });
const url = defineModel('url', { type: String, default: '' });
defineProps({
    editing: Boolean,
    disabled: Boolean,
    error: { type: String, default: '' },
});
const emit = defineEmits(['apply', 'remove']);
</script>
