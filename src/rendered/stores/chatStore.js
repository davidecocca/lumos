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
    const scrollState = ref({
        top: 0,
        distanceFromBottom: 0,
        anchorIndex: 0,
        anchorOffset: 0,
    })
    
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
        scrollState.value = {
            top: 0,
            distanceFromBottom: 0,
            anchorIndex: 0,
            anchorOffset: 0,
        }
    }
    
    const addMessage = (message) => {
        messages.value.push(message)
    }
    
    const updateMessage = (index, message) => {
        messages.value[index] = message
    }

    const updateScrollState = ({ top, clientHeight, scrollHeight, anchorIndex, anchorOffset }) => {
        const maxScroll = Math.max(0, scrollHeight - clientHeight)
        scrollState.value = {
            top,
            distanceFromBottom: Math.max(0, maxScroll - top),
            anchorIndex,
            anchorOffset,
        }
    }
    
    return {
        messages,
        currentScope,
        userInput,
        scrollState,
        resetChat,
        addMessage,
        updateMessage,
        updateScrollState,
    }
})
