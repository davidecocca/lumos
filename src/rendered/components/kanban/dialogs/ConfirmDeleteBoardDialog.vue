<template>
    <BaseDialog
        v-model="open"
        title="Delete board"
        icon="ph-trash"
        icon-color="error"
        :persistent="busy"
    >
        This board will be permanently deleted, including all cards. This action
        cannot be undone.
        <v-alert
            v-if="error"
            type="error"
            variant="tonal"
            rounded="lg"
            density="comfortable"
            class="mt-3"
            >{{ error }}</v-alert
        >
        <template #actions>
            <v-spacer />
            <v-btn variant="text" :disabled="busy" @click="open = false"
                >Cancel</v-btn
            >
            <v-btn
                color="error"
                variant="tonal"
                :loading="busy"
                :disabled="disabled"
                @click="emit('delete')"
                >Delete</v-btn
            >
        </template>
    </BaseDialog>
</template>

<script setup>
import BaseDialog from '../../commons/BaseDialog.vue';
const open = defineModel({ type: Boolean, default: false });
defineProps({
    busy: Boolean,
    disabled: Boolean,
    error: { type: String, default: '' },
});
const emit = defineEmits(['delete']);
</script>
