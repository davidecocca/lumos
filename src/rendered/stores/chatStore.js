import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useChatStore = defineStore('chat', () => {
    const createSession = (scope, noteId = null) => ({
        conversationId: null,
        scope,
        noteId,
        title: '',
        createdAt: null,
        updatedAt: null,
        messages: [],
        userInput: '',
    })

    // State
    const conversations = ref({
        all: createSession('all'),
    })

    const getSessionKey = (scope = 'all', noteId = null) => {
        if (scope === 'note') return noteId ? `note:${noteId}` : 'note'
        return 'all'
    }

    const ensureSession = (scope = 'all', noteId = null) => {
        const key = getSessionKey(scope, noteId)

        if (!conversations.value[key]) {
            conversations.value[key] = createSession(scope, noteId)
        }

        return conversations.value[key]
    }

    const getSession = (scope = 'all', noteId = null) => ensureSession(scope, noteId)

    const toUiMessage = (message) => {
        if (message.role === 'user') {
            return {
                text: message.content,
                user: 'user',
                bgColor: '',
                variant: 'tonal',
                sources: [],
            }
        }

        return {
            text: message.content,
            user: 'bot',
            bgColor: 'transparent',
            variant: 'flat',
            sources: message.sources || [],
        }
    }

    // Actions
    const resetChat = (scope = 'all', noteId = null) => {
        const session = ensureSession(scope, noteId)
        session.conversationId = null
        session.scope = scope
        session.noteId = noteId
        session.title = ''
        session.createdAt = null
        session.messages = []
        session.userInput = ''
        session.updatedAt = new Date().toISOString()
    }
    
    const addMessage = (scope, message, noteId = null) => {
        const session = ensureSession(scope, noteId)
        session.messages.push(message)
        session.updatedAt = new Date().toISOString()
    }
    
    const updateMessage = (scope, index, message, noteId = null) => {
        const session = ensureSession(scope, noteId)
        session.messages[index] = message
        session.updatedAt = new Date().toISOString()
    }

    const setUserInput = (scope, value, noteId = null) => {
        ensureSession(scope, noteId).userInput = value
    }

    const loadConversation = (conversation) => {
        if (!conversation) return null

        const session = ensureSession(conversation.scope, conversation.noteId)
        session.conversationId = conversation.id
        session.scope = conversation.scope
        session.noteId = conversation.noteId
        session.title = conversation.title || ''
        session.createdAt = conversation.createdAt
        session.updatedAt = conversation.updatedAt
        session.messages = [
            ...(conversation.messages || []).map(toUiMessage),
        ]
        session.userInput = ''

        return session
    }

    const setConversationMeta = (scope, noteId, conversation) => {
        const session = ensureSession(scope, noteId)
        session.conversationId = conversation?.id || null
        session.title = conversation?.title || ''
        session.createdAt = conversation?.createdAt || null
        session.updatedAt = conversation?.updatedAt || new Date().toISOString()
    }

    const createChatConversation = async (payload) => {
        return window.api.createChatConversation(payload)
    }

    const listChatConversations = async (payload) => {
        return window.api.listChatConversations(payload)
    }

    const getChatConversation = async (id) => {
        return window.api.getChatConversation(id)
    }

    const appendChatMessage = async (payload) => {
        return window.api.appendChatMessage(payload)
    }

    const renameChatConversation = async (id, title) => {
        return window.api.updateChatConversation({
            id: Number(id),
            title,
        })
    }

    const deleteChatConversation = async (id) => {
        return window.api.deleteChatConversation(Number(id))
    }
    
    return {
        conversations,
        getSessionKey,
        getSession,
        resetChat,
        addMessage,
        updateMessage,
        setUserInput,
        loadConversation,
        setConversationMeta,
        createChatConversation,
        listChatConversations,
        getChatConversation,
        appendChatMessage,
        renameChatConversation,
        deleteChatConversation,
    }
})
