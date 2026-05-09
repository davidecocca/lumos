<template>
    <v-dialog
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        max-width="520"
    >
        <v-card rounded="xl" elevation="8">
            <v-card-title class="d-flex align-center pt-5 pb-1 px-6">
                <v-avatar color="deep-purple-lighten-5" size="36" class="mr-3">
                    <v-icon size="22" color="deep-purple-darken-2">ph-chat-circle-text</v-icon>
                </v-avatar>
                <div>
                    <div class="text-headline-small">Rename chat</div>
                    <div class="text-label-large text-medium-emphasis">Enter a new title for the chat.</div>
                </div>
            </v-card-title>

            <v-card-text class="px-6 pb-4">
                <v-text-field
                    v-model="chatTitle"
                    label="Chat title"
                    clearable
                    variant="outlined"
                    @click:clear="handleClear"
                    @keydown.enter="handleEnter"
                />
            </v-card-text>

            <v-divider />
            <v-card-actions class="px-6 py-3">
                <v-spacer />
                <v-btn variant="text" @click="closeDialog">Close</v-btn>
                <v-btn color="primary" variant="tonal" :disabled="!chatTitle.trim()" @click="renameChat">Save</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false,
    },
    chatId: {
        type: [Number, String],
        default: null,
    },
    currentChatTitle: {
        type: String,
        default: '',
    },
})

const emit = defineEmits(['update:modelValue', 'rename-chat'])

const chatTitle = ref(props.currentChatTitle)

watch(() => props.modelValue, (isOpen) => {
    if (isOpen) {
        chatTitle.value = props.currentChatTitle || 'New chat'
    }
})

const closeDialog = () => {
    emit('update:modelValue', false)
}

const handleClear = () => {
    chatTitle.value = ''
}

const renameChat = () => {
    if (!props.chatId || !chatTitle.value.trim()) return

    emit('rename-chat', props.chatId, chatTitle.value.trim())
}

const handleEnter = () => {
    renameChat()
}
</script>
