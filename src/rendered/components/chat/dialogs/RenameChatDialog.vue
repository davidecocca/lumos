<template>
    <BaseDialog
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        title="Rename chat"
        subtitle="Enter a new title for this chat."
        icon="ph-pencil-simple-line"
    >
        <v-text-field
            v-model="chatTitle"
            label="Chat title"
            clearable
            variant="outlined"
            density="comfortable"
            @click:clear="handleClear"
            @keydown.enter="handleEnter"
        />

        <template #actions>
            <v-spacer />
            <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
            <v-btn color="primary" variant="tonal" :disabled="!chatTitle.trim()" @click="renameChat">Save</v-btn>
        </template>
    </BaseDialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import BaseDialog from '../../commons/BaseDialog.vue'

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
