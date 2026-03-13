<template>
    <v-container fluid class="pa-2">
        <v-tabs
        v-model="tab"
        color="primary"
        class="mb-4"
        >
        <v-tab :value="chatTab">Chat</v-tab>
        
        <v-spacer></v-spacer>
        
        <!-- New chat button -->
        <v-tooltip text="New chat" location="bottom">
            <template v-slot:activator="{ props }">
                <v-btn
                v-bind="props"
                variant="text"
                icon="ph-plus"
                @click="resetChat"
                ></v-btn>
            </template>
        </v-tooltip>
        
        <!-- Expand / Collapse button -->
        <v-tooltip :text="isChatFullscreen ? 'Collapse' : 'Expand'" location="bottom">
            <template v-slot:activator="{ props }">
                <v-btn
                v-bind="props"
                variant="text"
                :icon="isChatFullscreen ? 'ph-arrows-in-simple' : 'ph-arrows-out-simple'"
                @click="toggleChatExpansion"
                ></v-btn>
            </template>
        </v-tooltip>
    </v-tabs>
    
    <!-- Chat content -->
    <v-tabs-window v-model="tab">
        <v-tabs-window-item :value="chatTab">
            <div class="chat-container" ref="chatContainer" :style="{ height: chatContainerHeight }">
                <v-list
                lines="one"
                v-if="chatStore.messages.length > 0"
                style="background-color: transparent;"
                >
                <v-list-item
                v-for="(message, index) in chatStore.messages"
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
    
    <!-- Input area -->
    <v-card
    class="mx-4 border"
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

</v-tabs-window-item>
</v-tabs-window>
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

import { ref, nextTick, computed, onMounted, watch, mergeProps } from 'vue'

const props = defineProps({
    "isChatFullscreen": {
        type: Boolean,
        default: false,
    },
    "isChatOpen": {
        type: Boolean,
        default: false,
    },
})

const emit = defineEmits(['update:isChatFullscreen', 'update:isChatOpen']);

// Store for AI preferences
const aiStore = aiPreferencesStore();

// Store for folders and notes
const store = useFoldersStore()

// Chat store
const chatStore = useChatStore()

// Tabs for switching between favorite and recent notes
const chatTab = 'chatTab'
const tab = ref(chatTab)

const chatContainer = ref(null)

// Computed height for chat container based on fullscreen state
const chatContainerHeight = computed(() => {
    return props.isChatFullscreen ? 'calc(100vh - 335px)' : 'calc(100vh - 305px)'
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

// Load AI preferences on mount
onMounted(() => {
    aiStore.loadPreferences();
});

// Watch for activeNoteId changes and reset scope if necessary
watch(() => store.activeNoteId, (newActiveNoteId) => {
    if (!newActiveNoteId && chatStore.currentScope === 'current') {
        chatStore.currentScope = 'all';
    }
});

const resetChat = () => {
    chatStore.resetChat()
}

// Function to toggle chat expansion
const toggleChatExpansion = () => {
    emit('update:isChatOpen', !props.isChatOpen)
    emit('update:isChatFullscreen', !props.isChatFullscreen)
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
.chat-container {
    overflow-y: auto;
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
