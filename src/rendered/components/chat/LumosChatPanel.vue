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
                <v-menu
                v-if="props.showHeaderActions"
                v-model="isHistoryOpen"
                location="bottom end"
                >
                <template v-slot:activator="{ props: menuProps }">
                    <v-tooltip text="Recents" location="bottom">
                        <template v-slot:activator="{ props: tooltipProps }">
                            <v-btn
                            v-bind="mergeProps(menuProps, tooltipProps)"
                            variant="text"
                            density="comfortable"
                            icon="ph-clock-counter-clockwise"
                            @click="loadRecentConversations"
                            />
                        </template>
                    </v-tooltip>
                </template>
                
                <v-list min-width="280" max-height="360" density="compact" class="overflow-y-auto pl-1 pr-1 pt-2 pb-2">
                    <v-list-subheader>Recents</v-list-subheader>
                    <v-list-item
                    v-if="recentConversations.length === 0"
                    prepend-icon="ph-clock-counter-clockwise"
                    title="No recent chats"
                    />
                    <v-list-item
                    v-for="conversation in recentConversations"
                    :key="conversation.id"
                    :active="conversation.id === session.conversationId"
                    rounded="lg"
                    density="compact"
                    @click="selectConversation(conversation.id)"
                    >
                    <v-list-item-title>{{ conversation.title || 'New chat' }}</v-list-item-title>
                    <v-list-item-subtitle>{{ formatConversationTime(conversation.updatedAt) }}</v-list-item-subtitle>
                    <template v-slot:append>
                        <v-menu>
                            <template v-slot:activator="{ props }">
                                <v-tooltip text="More" location="top">
                                    <template v-slot:activator="{ props: tooltipProps }">
                                        <v-btn
                                        v-bind="{ ...props, ...tooltipProps }"
                                        icon="ph-dots-three"
                                        size="small"
                                        variant="text"
                                        density="compact"
                                        class="ml-2"
                                        @click.stop
                                        />
                                    </template>
                                </v-tooltip>
                            </template>
                            <v-list density="compact" rounded="lg" class="pl-1 pr-1 pt-2 pb-2">
                                <v-list-item @click.stop="openRenameChatDialog(conversation)" rounded="lg">
                                    <template v-slot:append>
                                        <v-icon icon="ph-pencil-line"></v-icon>
                                    </template>
                                    <v-list-item-title>Rename</v-list-item-title>
                                </v-list-item>
                                <v-list-item
                                class="delete-menu-action"
                                base-color="error"
                                @click.stop="openDeleteChatDialog(conversation)"
                                rounded="lg"
                                >
                                    <template v-slot:append>
                                        <v-icon icon="ph-trash"></v-icon>
                                    </template>
                                    <v-list-item-title>Delete</v-list-item-title>
                                </v-list-item>
                            </v-list>
                        </v-menu>
                    </template>
                </v-list-item>
            </v-list>
        </v-menu>
        
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

<div
class="chat-content"
:class="{ 'align-center justify-center pb-16': isChatEmpty }"
>
<v-slide-y-transition leave-absolute>
    <div
    v-if="isChatEmpty"
    class="w-100"
    >
    <EmptyChatState />
</div>
</v-slide-y-transition>

<div
v-if="!isChatEmpty"
class="chat-container"
ref="chatContainer"
>
<v-list
lines="one"
style="background-color: transparent;"
>
<v-list-item
v-for="(message, index) in messages"
:key="index"
:data-message-index="index"
class="mb-2"
>
<div v-if="message.user === 'bot'" class="d-flex flex-grow-1 justify-start align-items-center" style="max-width: 80%;">
    <ChatCard
    class="flex-grow-1"
    :message="message"
    :showSources="showSources"
    @open-source="openSourceNote"
    />
</div>
<div v-if="message.user === 'user'" class="d-flex justify-end flex-grow-1">
    <ChatCard
    :message="message"
    :showSources="showSources"
    class="ms-auto"
    style="max-width: 80%"
    @open-source="openSourceNote"
    />
</div>
</v-list-item>
</v-list>
</div>

<!-- Input area -->
<v-card
class="border chat-input-card align-self-center"
color="nav-background"
elevation="0"
rounded="xl"
width="calc(100% - 32px)"
max-width="800"
>
<v-card-text class="ps-2 pt-1 pb-0">
    <v-textarea
    v-model="userInput"
    placeholder="Ask something"
    hide-details
    rows="1"
    max-rows="5"
    variant="plain"
    auto-grow
    class="ml-2 mr-2"
    @keydown.enter="handleInputEnter"
    />
</v-card-text>

<v-card-actions class="pt-2 pb-2 px-4 d-flex ga-2 align-center flex-nowrap">
    <v-spacer />
    
    <div class="d-flex align-center ga-2 justify-end" style="min-width: 0;">
        <div class="model-trigger-wrap">
            <v-menu location="top end">
                <template v-slot:activator="{ props: menuProps }">
                    <v-tooltip text="Pick model" location="top">
                        <template v-slot:activator="{ props: tooltipProps }">
                            <v-btn
                            v-bind="mergeProps(menuProps, tooltipProps)"
                            class="model-trigger text-none px-2"
                            variant="text"
                            rounded="lg"
                            size="small"
                            style="min-width: 0;"
                            >
                            <span class="model-trigger-label">{{ selectedModelTitle }}</span>
                            <v-icon icon="ph-caret-down" size="small" class="ml-2 flex-shrink-0" />
                        </v-btn>
                    </template>
                </v-tooltip>
            </template>
            <v-list density="compact" rounded="lg" class="pl-1 pr-1 pt-2 pb-2">
                <v-list-item
                v-for="item in availableChatModels"
                :key="`${item.value.provider}-${item.value.model}`"
                rounded="lg"
                @click="selectModel(item.value)"
                >
                <template v-slot:prepend>
                    <ModelProviderMark :provider="item.value.provider" class="me-3" />
                </template>
                <v-list-item-title class="text-no-wrap">
                    {{ item.title }}
                </v-list-item-title>
                <template v-slot:append>
                    <v-icon
                    v-if="isModelSelected(item.value)"
                    icon="ph-check"
                    size="small"
                    />
                </template>
            </v-list-item>
        </v-list>
    </v-menu>
</div>

<v-tooltip text="Send (⏎)" location="top">
    <template v-slot:activator="{ props: activatorProps }">
        <v-btn
        v-bind="activatorProps"
        class="flex-shrink-0"
        icon
        rounded="pill"
        variant="tonal"
        color="primary"
        size="small"
        @click="sendMessage()"
        >
        <v-icon icon="ph-arrow-up" />
    </v-btn>
</template>
</v-tooltip>
</div>
</v-card-actions>
</v-card>
</div>
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
import ChatCard from './ChatCard.vue'
import EmptyChatState from './EmptyChatState.vue'
import ModelProviderMark from '../ai/ModelProviderMark.vue'
import RenameChatDialog from './dialogs/RenameChatDialog.vue'
import ConfirmDeleteChatDialog from './dialogs/ConfirmDeleteChatDialog.vue'

import { createLlmService } from '../../services/llmService'
import { aiPreferencesStore } from '../../stores/aiPreferencesStore';
import { useFoldersStore } from '../../stores/foldersStore';
import { useChatStore } from '../../stores/chatStore';
import chatRagPrompt from '../../prompts/chatRagPrompt';
import { buildModelItems } from '../../utils/modelProviders'

import { ref, nextTick, computed, onMounted, watch, mergeProps } from 'vue'
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

const chatContainer = ref(null)
const activeNoteId = computed(() => props.scope === 'note' ? props.noteId : null)
const session = computed(() => chatStore.getSession(props.scope, activeNoteId.value))
const messages = computed(() => session.value.messages)
const isChatEmpty = computed(() => messages.value.length === 0)
const userInput = computed({
    get: () => session.value.userInput,
    set: (value) => chatStore.setUserInput(props.scope, value, activeNoteId.value),
})
const recentConversations = ref([])
const isHistoryOpen = ref(false)
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

const isModelSelected = (modelValue) => {
    return modelValue.provider === aiStore.chat.provider && modelValue.model === aiStore.chat.model
}

const selectedModelTitle = computed(() => {
    const match = availableChatModels.value.find((item) => (
    item.value.provider === aiStore.chat.provider &&
    item.value.model === aiStore.chat.model
    ))
    return match?.title || 'Model'
})

const scrollToBottom = async () => {
    await nextTick()
    
    requestAnimationFrame(() => {
        const el = chatContainer.value
        if (!el) return
        el.scrollTop = el.scrollHeight
    })
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
    isHistoryOpen.value = false
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

const formatConversationTime = (value) => {
    if (!value) return ''
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value))
}

const openSourceNote = async (noteId) => {
    await store.openNote(noteId, router)
}

const chunkDivederText = '\n\n-------\n\n'

const handleInputEnter = (event) => {
    if (event.shiftKey) return
    
    event.preventDefault()
    sendMessage()
}

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

.chat-content {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.chat-container {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding-bottom: 8px;
}

.chat-input-card {
    flex-shrink: 0;
    margin-inline: 16px;
    margin-bottom: 16px;
}

/* Styles for model trigger button to handle model names of varying lengths */
.model-trigger {
    min-width: 0;
    max-width: 100%;
}

.model-trigger-wrap {
    max-width: min(280px, 100%);
    flex: 0 1 auto;
    min-width: 0;
}

.model-trigger :deep(.v-btn__content) {
    min-width: 0;
    flex-wrap: nowrap;
}

.model-trigger-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
