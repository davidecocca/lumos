<template>
    <v-card 
        v-if="modelValue"
        elevation="1"
        class="rounded-md border ma-3 ask-ai-sidebar"
        rounded="lg"
        :style="{ height: 'calc(100vh - 268px)' }"
    >
            <div class="sidebar-header">
                <div class="d-flex align-center">
                    <v-icon class="mr-2" color="primary">mdi-forum</v-icon>
                    <div>
                        <h3 class="text-h6">Ask AI</h3>
                        <p class="text-caption text-grey-darken-1 ma-0">Ask questions about this note</p>
                    </div>
                </div>
                <div class="d-flex">
                    <v-tooltip text="Clear chat and start new conversation">
                        <template v-slot:activator="{ props }">
                            <v-btn
                                v-bind="props"
                                icon="mdi-refresh"
                                variant="text"
                                size="small"
                                @click="resetChat"
                                class="mr-1"
                            />
                        </template>
                    </v-tooltip>
                    <v-btn
                        icon="mdi-close"
                        variant="text"
                        size="small"
                        @click="closeSidebar"
                    />
                </div>
        </div>
        
        <v-divider></v-divider>
        
        <div class="chat-container" ref="chatContainer">
            <v-list
                v-if="messages.length > 0"
                style="background-color: transparent;"
                class="pa-0"
            >
                <v-list-item
                    v-for="(message, index) in messages"
                    :key="index"
                    class="mb-2 pa-2"
                >
                    <div v-if="message.user === 'bot'" class="d-flex flex-grow-1 justify-start align-items-center">
                        <ChatCard
                            class="flex-grow-1"
                            :message="message"
                            style="max-width: 95%;"
                        />
                    </div>
                    <div v-if="message.user === 'user'" class="d-flex justify-end flex-grow-1">
                        <ChatCard
                            :message="message"
                            class="ms-auto"
                            style="max-width: 95%;"
                        />
                    </div>
                </v-list-item>
            </v-list>
        </div>

        <div class="chat-input">
            <v-text-field
                v-model="userInput"
                label="Ask something about this note"
                variant="outlined"
                hide-details
                clearable
                single-line
                @keydown="onInputKeydown"
                class="ma-4"
                :disabled="isGenerating"
            >
                <template #append-inner>
                    <v-tooltip text="Send" location="top">
                        <template #activator="{ props }">
                            <v-icon
                                v-bind="props"
                                icon="mdi-send"
                                @click="sendMessage()"
                                class="ml-2 send-icon"
                                :class="{ disabled: isGenerating || !userInput.trim() }"
                            />
                        </template>
                    </v-tooltip>
                </template>
            </v-text-field>
        </div>
        </v-card>
</template>

<script setup>
import ChatCard from '../chat/ChatCard.vue'
import { createLlmService } from '../../services/llmService'
import chatRagPrompt from '../../prompts/chatRagPrompt'

import { ref, reactive, nextTick, watch } from 'vue'

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    selectedText: {
        type: String,
        default: ''
    },
    theme: {
        type: String,
        default: 'light'
    },
    noteContent: {
        type: String,
        default: ''
    },
    noteId: {
        type: Number,
        default: null
    }
})

const emit = defineEmits(['update:modelValue'])

const userInput = ref('')
const defaultBotMessageText = 'Hi! I can help you understand and work with your note. What would you like to know?'
const defaultBotMessage = {
    text: defaultBotMessageText,
    user: 'bot',
    bgColor: 'transparent',
    variant: 'flat',
    sources: [],
}
const generatingBotMessageText = 'Generating...'
const generatingBotMessage = {
    text: generatingBotMessageText,
    user: 'bot',
    bgColor: 'transparent',
    variant: 'flat',
    sources: [],
}
const messages = ref([defaultBotMessage])
const isGenerating = ref(false)
const chatContainer = ref(null)

const resetChat = () => {
    messages.value = []
    messages.value.push(defaultBotMessage)
    userInput.value = ''
    isGenerating.value = false
}

const closeSidebar = () => {
    // Reset everything when closing
    resetChat()
    emit('update:modelValue', false)
}

const sendMessage = async () => {
    try {
        if (userInput.value.trim() === '' || isGenerating.value) return
        
        isGenerating.value = true
        
        messages.value.push({
            text: userInput.value,
            user: 'user',
            bgColor: '',
            variant: 'tonal',
            sources: [],
        })
        
        // Scroll to the bottom of the chat container
        await nextTick()
        if (chatContainer.value) {
            chatContainer.value.scrollTop = chatContainer.value.scrollHeight
        }
        
        const userMessage = userInput.value
        userInput.value = ''
        
        // Use the current note content as context for the AI
        const context = props.noteContent || 'No note content available.'
        
        // Init the LLM service for the note-specific chat
        const noteChatLLMService = createLlmService(chatRagPrompt(context), 'chat')
        
        // Add initial empty bot message
        const botMessageIndex = messages.value.length
        messages.value.push({ 
            ...generatingBotMessage,
            sources: []
        })
        
        // Stream the response
        const stream = await noteChatLLMService.stream(userMessage)
        let accumulatedText = ''
        
        for await (const chunk of stream) {
            accumulatedText += chunk
            messages.value[botMessageIndex].text = accumulatedText
            
            // Scroll to the bottom of the chat container
            await nextTick()
            if (chatContainer.value) {
                chatContainer.value.scrollTop = chatContainer.value.scrollHeight
            }
        }
        
        // Add source information (current note)
        if (props.noteId) {
            messages.value[botMessageIndex].sources.push({
                title: 'Current Note',
                id: props.noteId,
                folderName: '',
            })
        }
        
        // Scroll to the bottom of the chat container
        await nextTick()
        if (chatContainer.value) {
            chatContainer.value.scrollTop = chatContainer.value.scrollHeight
        }
        
    } catch (error) {
        console.error('Error:', error)
        messages.value.push({
            text: 'Error: ' + error.message,
            user: 'bot',
            bgColor: 'red',
            variant: 'tonal',
            sources: [],
        })
    } finally {
        isGenerating.value = false
    }
}

const onInputKeydown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isGenerating.value && userInput.value.trim()) {
        e.preventDefault()
        sendMessage()
    }
}

// Reset chat when note content changes
watch(() => props.noteContent, () => {
    if (props.modelValue) {
        resetChat()
    }
})
</script>

<style scoped>
.ask-ai-sidebar {
    display: flex;
    flex-direction: column;
}

.sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #e0e0e0;
    border-bottom-color: v-bind('props.theme === "dark" ? "#333" : "#e0e0e0"');
    flex-shrink: 0;
}

.chat-container {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
    margin-bottom: 0;
}

.chat-input {
    width: 100%;
    border-top: 1px solid #e0e0e0;
    border-top-color: v-bind('props.theme === "dark" ? "#333" : "#e0e0e0"');
    background: inherit;
    flex-shrink: 0;
}

.send-icon.disabled {
    opacity: 0.4;
    pointer-events: none;
}
</style>