import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useChatStore = defineStore('chat', () => {
    // State
    const messages = ref([{
        text: 'Smart notes. Smarter you. What are we working on today?',
        user: 'bot',
        bgColor: 'transparent',
        variant: 'flat',
        sources: [],
    }])
    const currentScope = ref('all')
    const userInput = ref('')
    
    // Actions
    const resetChat = () => {
        messages.value = [{
            text: 'Smart notes. Smarter you. What are we working on today?',
            user: 'bot',
            bgColor: 'transparent',
            variant: 'flat',
            sources: [],
        }]
        userInput.value = ''
    }
    
    const addMessage = (message) => {
        messages.value.push(message)
    }
    
    const updateMessage = (index, message) => {
        messages.value[index] = message
    }
    
    return {
        messages,
        currentScope,
        userInput,
        resetChat,
        addMessage,
        updateMessage
    }
})