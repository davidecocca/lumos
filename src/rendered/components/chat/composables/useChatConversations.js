import { computed, ref } from 'vue'
import { useChatStore } from '../../../stores/chatStore'

export function useChatConversations({
    scope,
    activeNoteId,
    conversationId,
    startEmpty,
    emit,
    scrollToBottom,
}) {
    const chatStore = useChatStore()

    const session = computed(() => chatStore.getSession(scope.value, activeNoteId.value))
    const messages = computed(() => session.value.messages)
    const userInput = computed({
        get: () => session.value.userInput,
        set: (value) => chatStore.setUserInput(scope.value, value, activeNoteId.value),
    })

    const recentConversations = ref([])
    const renameChatDialog = ref(false)
    const deleteChatDialog = ref(false)
    const activeChatId = ref(null)
    const activeChatTitle = ref('')

    const resetSession = () => {
        chatStore.resetChat(scope.value, activeNoteId.value)
    }

    const resetChat = () => {
        resetSession()
        emit('new-thread')
    }

    const normalizeTitle = (value) => {
        const title = String(value || '').replace(/\s+/g, ' ').trim()
        if (!title) return 'New chat'
        return title.length > 48 ? `${title.slice(0, 45)}...` : title
    }

    const loadRecentConversations = async () => {
        if (scope.value === 'note' && !activeNoteId.value) {
            recentConversations.value = []
            return []
        }

        recentConversations.value = await chatStore.listChatConversations({
            scope: scope.value,
            noteId: activeNoteId.value,
            limit: 30,
        })

        return recentConversations.value
    }

    const filterMissingSourceNotes = async (conversation) => {
        const noteIds = [
            ...new Set((conversation.messages || [])
                .flatMap((message) => message.sources || [])
                .map((source) => Number(source.id))
                .filter(Boolean)),
        ]

        if (noteIds.length === 0) return conversation

        const existingNotes = await window.api.getNotesByIds(noteIds)
        const existingIds = new Set(existingNotes.map((note) => Number(note.id)))

        return {
            ...conversation,
            messages: conversation.messages.map((message) => ({
                ...message,
                sources: (message.sources || []).filter((source) => existingIds.has(Number(source.id))),
            })),
        }
    }

    const loadConversationById = async (id) => {
        if (!id) {
            resetChat()
            return
        }

        const conversation = await chatStore.getChatConversation(Number(id))
        if (!conversation) {
            resetChat()
            return
        }

        chatStore.loadConversation(await filterMissingSourceNotes(conversation))
        emit('select-conversation', conversation.id)
        await scrollToBottom()
    }

    const initializeConversation = async () => {
        if (scope.value === 'note' && !activeNoteId.value) return

        if (startEmpty.value) {
            resetSession()
            return
        }

        if (conversationId.value) {
            await loadConversationById(conversationId.value)
            return
        }

        resetSession()
    }

    const selectConversation = async (id) => {
        await loadConversationById(id)
    }

    const openRenameChatDialog = (conversation) => {
        activeChatId.value = conversation.id
        activeChatTitle.value = conversation.title || 'New chat'
        renameChatDialog.value = true
    }

    const openDeleteChatDialog = (conversation) => {
        activeChatId.value = conversation.id
        activeChatTitle.value = conversation.title || 'New chat'
        deleteChatDialog.value = true
    }

    const handleRenameChat = async (chatId, title) => {
        await chatStore.renameChatConversation(chatId, title)
        renameChatDialog.value = false
        await loadRecentConversations()

        if (Number(session.value.conversationId) === Number(chatId)) {
            chatStore.setConversationMeta(scope.value, activeNoteId.value, {
                id: Number(chatId),
                title,
                createdAt: session.value.createdAt,
                updatedAt: new Date().toISOString(),
            })
        }

        emit('conversation-updated', {
            ...session.value,
            id: session.value.conversationId,
        })
    }

    const handleDeleteChat = async (chatId) => {
        await chatStore.deleteChatConversation(chatId)
        deleteChatDialog.value = false
        await loadRecentConversations()

        if (Number(session.value.conversationId) === Number(chatId)) {
            resetChat()
        }

        emit('conversation-updated', {
            ...session.value,
            id: session.value.conversationId,
        })
    }

    const ensurePersistedConversation = async (firstUserMessage) => {
        if (session.value.conversationId) return session.value.conversationId

        const conversation = await chatStore.createChatConversation({
            scope: scope.value,
            noteId: activeNoteId.value,
            title: normalizeTitle(firstUserMessage),
        })

        chatStore.setConversationMeta(scope.value, activeNoteId.value, conversation)
        return conversation.id
    }

    return {
        chatStore,
        session,
        messages,
        userInput,
        recentConversations,
        renameChatDialog,
        deleteChatDialog,
        activeChatId,
        activeChatTitle,
        resetSession,
        resetChat,
        loadRecentConversations,
        loadConversationById,
        initializeConversation,
        selectConversation,
        openRenameChatDialog,
        openDeleteChatDialog,
        handleRenameChat,
        handleDeleteChat,
        ensurePersistedConversation,
    }
}
