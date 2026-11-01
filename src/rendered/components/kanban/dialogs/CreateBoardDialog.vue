<template>
    <BaseDialog
        v-model="open"
        title="New board"
        subtitle="Create a board to organize your work."
        icon="ph-plus"
        :persistent="busy"
    >
        <v-form id="kanban-create-board-form" @submit.prevent="emit('create')">
            <v-text-field
                v-model="name"
                label="Board name"
                variant="outlined"
                density="comfortable"
                rounded="lg"
                autofocus
                maxlength="120"
                counter
                :disabled="busy"
            />
            <v-alert
                v-if="error"
                type="error"
                variant="tonal"
                rounded="lg"
                density="comfortable"
                class="mt-3"
                >{{ error }}</v-alert
            >
        </v-form>
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
                type="submit"
                form="kanban-create-board-form"
                color="primary"
                variant="tonal"
                :loading="busy"
                :disabled="disabled || !name.trim()"
                >Create</v-btn
            >
        </template>
    </BaseDialog>
</template>

<script setup>
import BaseDialog from '../../commons/BaseDialog.vue';
const open = defineModel({ type: Boolean, default: false });
const name = defineModel('name', { type: String, default: '' });
defineProps({
    busy: Boolean,
    disabled: Boolean,
    error: { type: String, default: '' },
});
const emit = defineEmits(['create']);
</script>
