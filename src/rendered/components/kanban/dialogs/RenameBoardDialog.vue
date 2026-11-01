<template>
    <BaseDialog
        v-model="open"
        title="Rename board"
        subtitle="Choose a new name for this board."
        icon="ph-pencil-simple-line"
        :persistent="busy"
    >
        <v-form id="kanban-rename-board-form" @submit.prevent="emit('save')">
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
            <v-btn variant="text" :disabled="busy" @click="open = false"
                >Cancel</v-btn
            >
            <v-btn
                type="submit"
                form="kanban-rename-board-form"
                color="primary"
                variant="tonal"
                :loading="busy"
                :disabled="disabled || !name.trim()"
                >Save</v-btn
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
const emit = defineEmits(['save']);
</script>
