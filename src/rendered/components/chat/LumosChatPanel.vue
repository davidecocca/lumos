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
import { useChatConversations } from './composables/useChatConversations'
import { useChatModelSelection } from './composables/useChatModelSelection'

import { createLlmService } from '../../services/llmService'
import { useFoldersStore } from '../../stores/foldersStore';
import chatRagPrompt from '../../prompts/chatRagPrompt';

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

// Store for folders and notes
const store = useFoldersStore()
const router = useRouter()

const chatMessageList = ref(null)
const scope = computed(() => props.scope)
const conversationId = computed(() => props.conversationId)
const startEmpty = computed(() => props.startEmpty)
const activeNoteId = computed(() => props.scope === 'note' ? props.noteId : null)

const showSources = computed(() => {
    return props.scope === 'all'
})

const scrollToBottom = async () => {
    await chatMessageList.value?.scrollToBottom()
}

const {
    loadModelPreferences,
    availableChatModels,
    selectedModel,
    selectedModelTitle,
    selectModel,
} = useChatModelSelection()

const {
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
} = useChatConversations({
    scope,
    activeNoteId,
    conversationId,
    startEmpty,
    emit,
    scrollToBottom,
})

// Load AI preferences on mount
onMounted(() => {
    loadModelPreferences();
    initializeConversation()
});

watch(() => props.isVisible, async (isVisible) => {
    if (isVisible) {
        resetSession()
        await scrollToBottom()
    }
})

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
        resetSession()
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
