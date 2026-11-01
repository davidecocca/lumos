<template>
    <BaseDialog
        v-model="open"
        title="Delete card"
        icon="ph-trash"
        icon-color="error"
        :persistent="busy"
    >
        This card will be permanently deleted. This action cannot be undone.
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
            <v-btn
                rounded="lg"
                variant="text"
                :disabled="busy"
                @click="open = false"
                >Cancel</v-btn
            >
            <v-btn
                rounded="lg"
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
