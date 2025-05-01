<template>
    <div class="d-flex flex-column align-center">
        <p class="text-h4">Lumos <b>AI</b></p>
        <p class="text-h6">Write. Chat. Connect.</p>
        
        <div class="d-flex flex-column mt-2 pl-4" style="align-self: flex-start;">
            <!-- New chat button -->
            <v-tooltip text="Clear this thread and start a new conversation">
                <template v-slot:activator="{ props }">
                    <v-btn
                    v-bind="props"
                    variant="tonal"
                    color="primary"
                    prepend-icon="mdi-plus"
                    @click="resetChat"
                    >New chat</v-btn>
                </template>
            </v-tooltip>
        </div>
        
        <div class="chat-container" ref="chatContainer">
            <v-list
            lines="one"
            v-if="messages.length > 0"
            style="background-color: transparent;"
            >
            <v-list-item
            v-for="(message, index) in messages"
            :key="index"
            class="mb-2"
            >
            <div v-if="message.user === 'bot'" class="d-flex flex-grow-1 justify-start align-items-center" style="max-width: 80%;">
                <ChatCard
                class="flex-grow-1"
                :message="message"
                />
            </div>
            <div v-if="message.user === 'user'" class="d-flex justify-end flex-grow-1">
                <ChatCard
                :message="message"
                class="ms-auto"
                style="max-width: 80%"
                />
            </div>
        </v-list-item>
    </v-list>
</div>

<div class="chat-input plr-0">
    <v-text-field
    v-model="userInput"
    label="Ask something"
    append-icon="mdi-send"
    variant="solo-filled"
    clearable
    @click:append="sendMessage"
    @keyup.enter="sendMessage"
    ></v-text-field>
</div>
</div>

</template>

<script setup>
import ChatCard from '../components/chat/ChatCard.vue'

import { createLlmService } from '../services/llmService'
import chatRagPrompt from '../prompts/chatRagPrompt';

import { ref, nextTick } from 'vue'

const userInput = ref('')
const defaultBotMessageText = 'Smart notes. Smarter you. What are we working on today?'
const defaultBotMessage = {
    text: defaultBotMessageText,
    user: 'bot',
    bgColor: 'transparent',
    variant: 'flat'
}
const generatingBotMessageText = 'Generating...'
const generatingBotMessage = {
    text: generatingBotMessageText,
    user: 'bot',
    bgColor: 'transparent',
    variant: 'flat'
}
const messages = ref([defaultBotMessage])

const chatContainer = ref(null)

const resetChat = () => {
    messages.value = []
    messages.value.push(defaultBotMessage)
}

const chunkDivederText = '\n\n-------\n'

const sendMessage = async () => {
    try {
        if (userInput.value.trim() === '') return
        
        messages.value.push({
            text: userInput.value,
            user: 'user',
            bgColor: '',
            variant: 'tonal'
        })
        
        // Scroll to the bottom of the chat container
        await nextTick()
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight
        
        const userMessage = userInput.value
        userInput.value = ''
        
        // Search for similar notes
        const results = await window.api.searchSimilarNotes(userInput.value)
        console.log('Search results:', results)
        
        // Build the context from the search results
        var context = ''
        results.forEach(element => {
            context += element.pageContent + chunkDivederText
        });
        console.log('Context:', context)
        
        // Init the LLM service for the RAG chatbot
        const ragChatLLMService = createLlmService(chatRagPrompt(context), 'chat');
        
        // Add initial empty bot message
        const botMessageIndex = messages.value.length
        messages.value.push({ ...generatingBotMessage })
        
        // Stream the response
        const stream = await ragChatLLMService.stream(userMessage)
        let accumulatedText = ''
        
        for await (const chunk of stream) {
            accumulatedText += chunk
            messages.value[botMessageIndex].text = accumulatedText
            
            // Scroll to the bottom of the chat container
            await nextTick()
            chatContainer.value.scrollTop = chatContainer.value.scrollHeight
        }
        
    } catch (error) {
        console.error('Error:', error)
        messages.value.push({
            text: 'Error: ' + error.message,
            user: 'bot',
            bgColor: 'red',
            variant: 'tonal'
        })
    }
}
</script>

<style scoped>
.chat-container {
    width: 100%;
    height: calc(100vh - 304px);
    overflow-y: auto;
    padding: 16px;
    margin-bottom: 38px;
}

.chat-input {
    width: 100%;
    max-width: 1000px;
}
</style>