<template>
    <v-container
    fluid
    class="chat-panel pa-0"
    >
        <div class="d-flex align-center ga-3 mb-4">
            <v-card
                class="w-100"
                variant="text"
                transparent
            >
                <template v-slot:append>
                    <div class="d-flex align-center justify-end ga-2 ms-auto">
                        <ChatHistoryMenu
                            v-if="props.showHeaderActions"
                            :conversations="recentConversations"
                            :active-conversation-id="session.conversationId"
                            @load="loadRecentConversations"
                            @select="selectConversation"
                            @rename="openRenameChatDialog"
                            @delete="openDeleteChatDialog"
                        />

                        <v-tooltip text="New chat" location="bottom">
                            <template v-slot:activator="{ props }">
                                <v-btn
                                    v-bind="props"
                                    variant="text"
                                    density="comfortable"
                                    icon="ph-plus"
                                    @click="resetChat"
                                />
                            </template>
                        </v-tooltip>
                    </div>
                </template>
            </v-card>
        </div>

        <ChatMessageList
            ref="chatMessageList"
            :messages="messages"
            :show-sources="showSources"
            @open-source="openSourceNote"
        >
            <ChatComposer
                v-model="userInput"
                :model-items="availableChatModels"
                :selected-model="selectedModel"
                :selected-model-title="selectedModelTitle"
                @select-model="selectModel"
                @send="sendMessage"
            />
        </ChatMessageList>
</v-container>

<RenameChatDialog
v-model="renameChatDialog"
:chat-id="activeChatId"
:current-chat-title="activeChatTitle"
@rename-chat="handleRenameChat"
/>
<ConfirmDeleteChatDialog
v-model="deleteChatDialog"
:chat-id="activeChatId"
@delete-chat="handleDeleteChat"
/>

</template>

<script setup>
import ChatComposer from './ChatComposer.vue'
import ChatHistoryMenu from './ChatHistoryMenu.vue'
import ChatMessageList from './ChatMessageList.vue'
import RenameChatDialog from './dialogs/RenameChatDialog.vue'
import ConfirmDeleteChatDialog from './dialogs/ConfirmDeleteChatDialog.vue'

import { createLlmService } from '../../services/llmService'
import { aiPreferencesStore } from '../../stores/aiPreferencesStore';
import { useFoldersStore } from '../../stores/foldersStore';
import { useChatStore } from '../../stores/chatStore';
import chatRagPrompt from '../../prompts/chatRagPrompt';
import { buildModelItems } from '../../utils/modelProviders'

import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
    scope: {
        type: String,
        default: 'all',
        validator: (value) => ['all', 'note'].includes(value),
    },
    noteId: {
        type: [Number, String],
        default: null,
    },
    conversationId: {
        type: [Number, String],
        default: null,
    },
    startEmpty: {
        type: Boolean,
        default: false,
    },
    showHeaderActions: {
        type: Boolean,
        default: false,
    },
    isVisible: {
        type: Boolean,
        default: true,
    },
})

const emit = defineEmits(['new-thread', 'select-conversation', 'conversation-updated'])

// Store for AI preferences
const aiStore = aiPreferencesStore();

// Store for folders and notes
const store = useFoldersStore()
const router = useRouter()

// Chat store
const chatStore = useChatStore()

const chatMessageList = ref(null)
const activeNoteId = computed(() => props.scope === 'note' ? props.noteId : null)
const session = computed(() => chatStore.getSession(props.scope, activeNoteId.value))
const messages = computed(() => session.value.messages)
const userInput = computed({
    get: () => session.value.userInput,
    set: (value) => chatStore.setUserInput(props.scope, value, activeNoteId.value),
})
const recentConversations = ref([])
const renameChatDialog = ref(false)
const deleteChatDialog = ref(false)
const activeChatId = ref(null)
const activeChatTitle = ref('')

const showSources = computed(() => {
    return props.scope === 'all'
})

// Available models for chat from all providers
const availableChatModels = computed(() => {
    return buildModelItems(aiStore.availableProviders, aiStore.getProviderModels)
});

// Selected model for chat
const selectedModel = computed({
    get: () => ({ 
        provider: aiStore.chat.provider, 
        model: aiStore.chat.model 
    }),
    set: (value) => {
        if (value) {
            aiStore.setProvider('chat', value.provider);
            aiStore.setModel('chat', value.model);
        }
    }
});

const selectModel = (modelValue) => {
    selectedModel.value = modelValue
}

const selectedModelTitle = computed(() => {
    const match = availableChatModels.value.find((item) => (
    item.value.provider === aiStore.chat.provider &&
    item.value.model === aiStore.chat.model
    ))
    return match?.title || 'Model'
})

const scrollToBottom = async () => {
    await chatMessageList.value?.scrollToBottom()
}

// Load AI preferences on mount
onMounted(() => {
    aiStore.loadPreferences();
    initializeConversation()
});

watch(() => props.isVisible, async (isVisible) => {
    if (isVisible) {
        chatStore.resetChat(props.scope, activeNoteId.value)
        await scrollToBottom()
    }
})

const resetChat = () => {
    chatStore.resetChat(props.scope, activeNoteId.value)
    emit('new-thread')
}

const normalizeTitle = (value) => {
    const title = String(value || '').replace(/\s+/g, ' ').trim()
    if (!title) return 'New chat'
    return title.length > 48 ? `${title.slice(0, 45)}...` : title
}

const loadRecentConversations = async () => {
    if (props.scope === 'note' && !activeNoteId.value) {
        recentConversations.value = []
        return []
    }
    
    recentConversations.value = await chatStore.listChatConversations({
        scope: props.scope,
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

const loadConversationById = async (conversationId) => {
    if (!conversationId) {
        resetChat()
        return
    }
    
    const conversation = await chatStore.getChatConversation(Number(conversationId))
    if (!conversation) {
        resetChat()
        return
    }
    
    chatStore.loadConversation(await filterMissingSourceNotes(conversation))
    emit('select-conversation', conversation.id)
    await scrollToBottom()
}

const initializeConversation = async () => {
    if (props.scope === 'note' && !activeNoteId.value) return
    
    if (props.startEmpty) {
        chatStore.resetChat(props.scope, activeNoteId.value)
        return
    }
    
    if (props.conversationId) {
        await loadConversationById(props.conversationId)
        return
    }
    
    chatStore.resetChat(props.scope, activeNoteId.value)
}

const selectConversation = async (conversationId) => {
    await loadConversationById(conversationId)
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
        chatStore.setConversationMeta(props.scope, activeNoteId.value, {
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
        scope: props.scope,
        noteId: activeNoteId.value,
        title: normalizeTitle(firstUserMessage),
    })
    
    chatStore.setConversationMeta(props.scope, activeNoteId.value, conversation)
    return conversation.id
}

const openSourceNote = async (noteId) => {
    await store.openNote(noteId, router)
}

const chunkDivederText = '\n\n-------\n\n'

const sendMessage = async () => {
    try {
        if (userInput.value.trim() === '') return
        if (props.scope === 'note' && !activeNoteId.value) return
        
        const userMessage = userInput.value
        const conversationId = await ensurePersistedConversation(userMessage)
        
        chatStore.addMessage(props.scope, {
            text: userMessage,
            user: 'user',
            bgColor: '',
            variant: 'tonal',
            sources: [],
        }, activeNoteId.value)
        
        await chatStore.appendChatMessage({
            conversationId,
            role: 'user',
            content: userMessage,
            sources: [],
        })
        
        // Scroll to the bottom of the chat container
        await scrollToBottom()
        
        userInput.value = ''
        
        // Search for similar notes
        var filter = {}
        
        console.log('Current scope:', props.scope)
        console.log('Active note ID:', store.activeNoteId)
        
        if (props.scope === 'note' && activeNoteId.value) {
            filter = { source: activeNoteId.value.toString() }
        }
        
        const payload = {
            query: userMessage,
            limit: 3,
            filter: filter,
        }
        console.log('Search payload:', payload)
        
        const results = await window.api.searchSimilarNotes(payload)
        console.log('Search results:', results)
        
        // Build the context from the search results
        var context = ''
        results.forEach((element, index) => {
            context += element.pageContent + (index < results.length - 1 ? chunkDivederText : '')
        });
        console.log('Context:', context)
        
        // Get notes id from results metadata (citing functionality)
        const notesIds = []
        results.forEach((element) => {
            notesIds.push(Number(element.metadata.source))
        });
        
        const notesForCiting = await window.api.getNotesByIds(notesIds)
        console.log('Notes for citing:', notesForCiting)
        
        // Init the LLM service for the RAG chatbot
        const ragChatLLMService = createLlmService(chatRagPrompt(context), 'chat');
        
        // Add initial empty bot message
        const botMessageIndex = messages.value.length
        chatStore.addMessage(props.scope, { 
            text: 'Generating...',
            user: 'bot',
            bgColor: 'transparent',
            variant: 'flat',
            sources: []
        }, activeNoteId.value)
        
        // Stream the response
        const stream = await ragChatLLMService.stream(userMessage)
        let accumulatedText = ''
        
        for await (const chunk of stream) {
            accumulatedText += chunk
            chatStore.updateMessage(props.scope, botMessageIndex, {
                ...messages.value[botMessageIndex],
                text: accumulatedText
            }, activeNoteId.value)
            
            // Scroll to the bottom of the chat container
            await scrollToBottom()
        }
        
        // Add citing information to the bot message
        const sources = notesForCiting.map((note) => ({
            title: note.title,
            id: note.id,
            folderName: note.folder_name,
        }))
        
        chatStore.updateMessage(props.scope, botMessageIndex, {
            ...messages.value[botMessageIndex],
            sources,
        }, activeNoteId.value)
        
        await chatStore.appendChatMessage({
            conversationId,
            role: 'assistant',
            content: accumulatedText,
            sources,
        })
        
        await loadRecentConversations()
        emit('conversation-updated', {
            ...session.value,
            id: conversationId,
        })
        
        // Scroll to the bottom of the chat container
        await scrollToBottom()
        
    } catch (error) {
        console.error('Error:', error)
        chatStore.addMessage(props.scope, {
            text: 'Error: ' + error.message,
            user: 'bot',
            bgColor: 'red',
            variant: 'tonal',
            sources: [],
        }, activeNoteId.value)
    }
}

watch(() => [props.scope, activeNoteId.value], async () => {
    await initializeConversation()
}, { flush: 'post' })

watch(() => props.conversationId, async (conversationId) => {
    if (!conversationId) {
        chatStore.resetChat(props.scope, activeNoteId.value)
        return
    }
    
    if (Number(conversationId) !== Number(session.value.conversationId)) {
        await loadConversationById(conversationId)
    }
})
</script>

<style scoped>
.chat-panel {
    height: 100%;
    min-height: 0;
    max-height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
}

</style>
