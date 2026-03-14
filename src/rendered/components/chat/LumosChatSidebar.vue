<template>
    <v-container
    fluid
    :class="['chat-sidebar pa-4', { 'chat-sidebar--fullscreen': isChatFullscreen }]"
    >
        <div class="d-flex align-center ga-3 mb-4">
            <div class="chat-header-icon">
                <v-icon icon="ph-chat-circle-text" size="20" />
            </div>
            <div>
                <p class="text-h6 font-weight-medium ma-0">Chat</p>
            </div>
            <v-spacer />

            <v-tooltip text="New chat" location="bottom">
                <template v-slot:activator="{ props }">
                    <v-btn
                    v-bind="props"
                    variant="text"
                    icon="ph-plus"
                    rounded="xl"
                    @click="resetChat"
                    />
                </template>
            </v-tooltip>

            <v-tooltip :text="isChatFullscreen ? 'Collapse (⌘L)' : 'Expand (⌘⇧L)'" location="bottom">
                <template v-slot:activator="{ props }">
                    <v-btn
                    v-bind="props"
                    variant="text"
                    :icon="isChatFullscreen ? 'ph-arrows-in-simple' : 'ph-arrows-out-simple'"
                    rounded="xl"
                    @click="toggleChatExpansion"
                    />
                </template>
            </v-tooltip>
        </div>

        <div class="chat-content">
            <div class="chat-container" ref="chatContainer">
                <v-list
                lines="one"
                v-if="chatStore.messages.length > 0"
                style="background-color: transparent;"
                >
                    <v-list-item
                    v-for="(message, index) in chatStore.messages"
                    :key="index"
                    :data-message-index="index"
                    class="mb-2"
                    >
                        <div v-if="message.user === 'bot'" class="d-flex flex-grow-1 justify-start align-items-center" style="max-width: 80%;">
                            <ChatCard
                            class="flex-grow-1"
                            :message="message"
                            @open-source="openSourceNote"
                            />
                        </div>
                        <div v-if="message.user === 'user'" class="d-flex justify-end flex-grow-1">
                            <ChatCard
                            :message="message"
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
            :class="['border', { 'chat-input-card--fullscreen': isChatFullscreen }]"
            elevation="0"
            rounded="xl"
            >
                <v-card-text class="ps-2 pt-1 pb-0">
                    <v-textarea
                    v-model="chatStore.userInput"
                    placeholder="Ask something"
                    variant="text"
                    hide-details
                    rows="2"
                    max-rows="2"
                    auto-grow
                    @keydown.ctrl.enter="sendMessage"
                    @keydown.meta.enter="sendMessage"
                    />
                </v-card-text>

                <v-card-actions class="pt-2 pb-2 px-4 d-flex ga-2 align-center flex-nowrap">
        <div class="d-flex align-center">
            <v-menu location="top start">
                <template v-slot:activator="{ props: menuProps }">
                    <v-tooltip text="Choose context" location="top">
                        <template v-slot:activator="{ props: tooltipProps }">
                            <v-btn
                            v-bind="mergeProps(menuProps, tooltipProps)"
                            variant="text"
                            rounded="xl"
                            style="min-width: 0;"
                            >
                            <v-icon :icon="scopeIcon" size="small" />
                            <v-icon icon="ph-caret-down" size="small" class="ml-1" />
                        </v-btn>
                    </template>
                </v-tooltip>
            </template>
            <v-list density="compact">
                <v-list-item title="All notes" @click="selectScope('all')">
                    <template v-slot:append>
                        <v-icon v-if="chatStore.currentScope === 'all'" icon="ph-check" size="small" />
                    </template>
                </v-list-item>
                <v-list-item title="Current note" :disabled="!canUseCurrentScope" @click="selectScope('current')">
                    <template v-slot:append>
                        <v-icon v-if="chatStore.currentScope === 'current'" icon="ph-check" size="small" />
                    </template>
                </v-list-item>
            </v-list>
        </v-menu>
    </div>
    
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
                            rounded="xl"
                            style="min-width: 0;"
                            >
                            <span class="model-trigger-label">{{ selectedModelTitle }}</span>
                            <v-icon icon="ph-caret-down" size="small" class="ml-2 flex-shrink-0" />
                        </v-btn>
                    </template>
                </v-tooltip>
            </template>
            <v-list density="compact">
                <v-list-item
                v-for="item in availableChatModels"
                :key="`${item.value.provider}-${item.value.model}`"
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

<v-tooltip text="Send (⌘⏎)" location="top">
    <template v-slot:activator="{ props: activatorProps }">
        <v-btn
        v-bind="activatorProps"
        class="flex-shrink-0"
        icon
        rounded="pill"
        variant="tonal"
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

</template>

<script setup>
import ChatCard from './ChatCard.vue'
import ModelProviderMark from '../ai/ModelProviderMark.vue'

import { createLlmService } from '../../services/llmService'
import { aiPreferencesStore } from '../../stores/aiPreferencesStore';
import { useFoldersStore } from '../../stores/foldersStore';
import { useChatStore } from '../../stores/chatStore';
import chatRagPrompt from '../../prompts/chatRagPrompt';
import { buildModelItems } from '../../utils/modelProviders'

import { ref, nextTick, computed, onMounted, onBeforeUnmount, watch, mergeProps } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
    "isChatFullscreen": {
        type: Boolean,
        default: false,
    },
    "isChatOpen": {
        type: Boolean,
        default: false,
    },
    "isVisible": {
        type: Boolean,
        default: false,
    },
})

const emit = defineEmits(['update:isChatFullscreen', 'update:isChatOpen']);

// Store for AI preferences
const aiStore = aiPreferencesStore();

// Store for folders and notes
const store = useFoldersStore()
const router = useRouter()

// Chat store
const chatStore = useChatStore()

const chatContainer = ref(null)

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

// Scope selection
const canUseCurrentScope = computed(() => Boolean(store.activeNoteId))
const scopeIcon = computed(() => chatStore.currentScope === 'current' ? 'ph-file' : 'ph-stack')

const selectScope = (scope) => {
    if (scope === 'current' && !canUseCurrentScope.value) return
    chatStore.currentScope = scope
}

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

const getAnchorData = (container) => {
    const containerRect = container.getBoundingClientRect()
    const messageElements = [...container.querySelectorAll('[data-message-index]')]

    for (const element of messageElements) {
        const rect = element.getBoundingClientRect()
        if (rect.bottom >= containerRect.top) {
            return {
                anchorIndex: Number(element.getAttribute('data-message-index')) || 0,
                anchorOffset: rect.top - containerRect.top,
            }
        }
    }

    const lastIndex = Math.max(0, chatStore.messages.length - 1)
    return {
        anchorIndex: lastIndex,
        anchorOffset: 0,
    }
}

const saveScrollPosition = () => {
    const el = chatContainer.value
    if (!el) return

    const { anchorIndex, anchorOffset } = getAnchorData(el)

    chatStore.updateScrollState({
        top: el.scrollTop,
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight,
        anchorIndex,
        anchorOffset,
    })
}

const restoreScrollPosition = async () => {
    await nextTick()

    requestAnimationFrame(() => {
        const el = chatContainer.value
        if (!el) return

        const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight)
        const { top, distanceFromBottom, anchorIndex, anchorOffset } = chatStore.scrollState
        const shouldStickToBottom = distanceFromBottom <= 48
        let targetTop = shouldStickToBottom
            ? Math.max(0, maxScroll - distanceFromBottom)
            : top

        if (!shouldStickToBottom) {
            const anchorElement = el.querySelector(`[data-message-index="${anchorIndex}"]`)

            if (anchorElement) {
                const containerRect = el.getBoundingClientRect()
                const anchorRect = anchorElement.getBoundingClientRect()
                targetTop = el.scrollTop + (anchorRect.top - containerRect.top) - anchorOffset
            }
        }

        el.scrollTop = Math.max(0, Math.min(maxScroll, targetTop))
    })
}

// Load AI preferences on mount
onMounted(() => {
    aiStore.loadPreferences();
    chatContainer.value?.addEventListener('scroll', saveScrollPosition, { passive: true })
});

onBeforeUnmount(() => {
    saveScrollPosition()
    chatContainer.value?.removeEventListener('scroll', saveScrollPosition)
})

// Watch for activeNoteId changes and reset scope if necessary
watch(() => store.activeNoteId, (newActiveNoteId) => {
    if (!newActiveNoteId && chatStore.currentScope === 'current') {
        chatStore.currentScope = 'all';
    }
});

watch(() => props.isVisible, async (isVisible) => {
    if (isVisible) {
        await restoreScrollPosition()
        return
    }

    saveScrollPosition()
}, { immediate: true })

const resetChat = () => {
    chatStore.resetChat()
}

// Function to toggle chat expansion
const toggleChatExpansion = () => {
    saveScrollPosition()
    emit('update:isChatOpen', !props.isChatOpen)
    emit('update:isChatFullscreen', !props.isChatFullscreen)
}

const openSourceNote = async (noteId) => {
    saveScrollPosition()

    if (props.isChatFullscreen) {
        emit('update:isChatFullscreen', false)
        emit('update:isChatOpen', true)
    }

    await store.openNote(noteId, router)
}

const chunkDivederText = '\n\n-------\n\n'

const sendMessage = async () => {
    try {
        if (chatStore.userInput.trim() === '') return
        
        chatStore.addMessage({
            text: chatStore.userInput,
            user: 'user',
            bgColor: '',
            variant: 'tonal',
            sources: [],
        })
        
        // Scroll to the bottom of the chat container
        await nextTick()
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight
        saveScrollPosition()
        
        const userMessage = chatStore.userInput
        chatStore.userInput = ''
        
        // Search for similar notes
        var filter = {}
        
        console.log('Current scope:', chatStore.currentScope)
        console.log('Active note ID:', store.activeNoteId)
        
        if (chatStore.currentScope === 'current' && store.activeNoteId) {
            filter = { source: store.activeNoteId.toString() }
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
        const botMessageIndex = chatStore.messages.length
        chatStore.addMessage({ 
            text: 'Generating...',
            user: 'bot',
            bgColor: 'transparent',
            variant: 'flat',
            sources: []
        })
        
        // Stream the response
        const stream = await ragChatLLMService.stream(userMessage)
        let accumulatedText = ''
        
        for await (const chunk of stream) {
            accumulatedText += chunk
            chatStore.updateMessage(botMessageIndex, {
                ...chatStore.messages[botMessageIndex],
                text: accumulatedText
            })
            
            // Scroll to the bottom of the chat container
            await nextTick()
            chatContainer.value.scrollTop = chatContainer.value.scrollHeight
            saveScrollPosition()
        }
        
        // Add citing information to the bot message
        notesForCiting.forEach((note) => {
            chatStore.messages[botMessageIndex].sources.push({
                title: note.title,
                id: note.id,
                folderName: note.folder_name,
            })
        })
        
        // Scroll to the bottom of the chat container
        await nextTick()
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight
        saveScrollPosition()
        
    } catch (error) {
        console.error('Error:', error)
        chatStore.addMessage({
            text: 'Error: ' + error.message,
            user: 'bot',
            bgColor: 'red',
            variant: 'tonal',
            sources: [],
        })
    }
}
</script>

<style scoped>
.chat-sidebar {
    height: 100%;
    min-height: 0;
    max-height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
}

.chat-sidebar--fullscreen {
    padding-bottom: 20px;
}

.chat-header-icon {
    width: 40px;
    height: 40px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(59, 130, 246, 0.12);
    color: rgb(37, 99, 235);
    flex-shrink: 0;
}

.chat-content {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow: hidden;
}

.chat-container {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding-bottom: 8px;
}

.chat-input-card--fullscreen {
    flex-shrink: 0;
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
