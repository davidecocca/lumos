<template>
    <v-dialog
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        max-width="520"
    >
        <v-card rounded="xl" elevation="8">
            <v-card-title class="d-flex align-center pt-5 pb-1 px-6">
                <v-avatar color="error" size="40" variant="tonal" class="mr-3">
                    <v-icon size="24">ph-trash</v-icon>
                </v-avatar>
                <div class="text-headline-small">Delete chat</div>
            </v-card-title>

            <v-card-text class="px-6 pb-4">
                This chat will be permanently deleted, including all messages. This action cannot be undone.
            </v-card-text>

            <v-divider />
            <v-card-actions class="px-6 py-3">
                <v-spacer />
                <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
                <v-btn color="error" variant="tonal" @click="deleteChat">Delete</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false,
    },
    chatId: {
        type: [Number, String],
        default: null,
    },
})

const emit = defineEmits(['update:modelValue', 'delete-chat'])

const closeDialog = () => {
    emit('update:modelValue', false)
}

const deleteChat = () => {
    if (!props.chatId) return

    emit('delete-chat', props.chatId)
}
</script>
