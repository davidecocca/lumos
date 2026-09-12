<template>
    <BaseDialog
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        title="Delete chat"
        icon="ph-trash"
        icon-color="error"
    >
        This chat will be permanently deleted, including all messages. This
        action cannot be undone.

        <template #actions>
            <v-spacer />
            <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
            <v-btn color="error" variant="tonal" @click="deleteChat"
                >Delete</v-btn
            >
        </template>
    </BaseDialog>
</template>

<script setup>
import BaseDialog from '../../commons/BaseDialog.vue';

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false,
    },
    chatId: {
        type: [Number, String],
        default: null,
    },
});

const emit = defineEmits(['update:modelValue', 'delete-chat']);

const closeDialog = () => {
    emit('update:modelValue', false);
};

const deleteChat = () => {
    if (!props.chatId) return;

    emit('delete-chat', props.chatId);
};
</script>
