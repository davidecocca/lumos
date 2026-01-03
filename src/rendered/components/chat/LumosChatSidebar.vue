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
                icon="mdi-plus"
                @click="resetChat"
                ></v-btn>
            </template>
        </v-tooltip>
        
        <!-- Fullscreen / Close button -->
        <v-tooltip :text="isChatFullscreen ? 'Close' : 'Fullscreen'" location="bottom">
            <template v-slot:activator="{ props }">
                <v-btn
                v-bind="props"
                variant="text"
                :icon="isChatFullscreen ? 'mdi-close' : 'mdi-arrow-expand'"
                @click="toggleChatExpansion"
                ></v-btn>
            </template>
        </v-tooltip>
    </v-tabs>
    
    <v-tabs-window v-model="tab">
        <v-tabs-window-item :value="chatTab">
            <div class="chat-container" ref="chatContainer" :style="{ height: chatContainerHeight }">
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
    
    <v-card
    class="ml-2 mr-2"
    variant="tonal"
    rounded="lg"
    >
    <v-card-item>
        <v-textarea
        v-model="userInput"
        placeholder="Ask something"
        variant="text"
        hide-details
        rows="2"
        max-rows="2"
        auto-grow
        @keydown.ctrl.enter="sendMessage"
        @keydown.meta.enter="sendMessage"
        >
        <template v-slot:append-inner>
            <v-tooltip text="Send (⌘⏎)" location="top">
                <template v-slot:activator="{ props }">
                    <v-icon
                    v-bind="props"
                    icon="mdi-send"
                    @click="sendMessage()"
                    class="ml-2"
                    />
                </template>
            </v-tooltip>
        </template>
    </v-textarea>
</v-card-item>

<v-card-actions class="align-left">
    <v-icon
    icon="mdi-filter"
    size="x-small"
    class="ml-3"
    />
    <v-select
    v-model="currentScope"
    :items="scopes"
    item-title="title"
    item-value="value"
    density="compact"
    variant="text"
    placeholder="Scope"
    :menu-props="{ maxHeight: 'none' }"
    hide-details
    min-width="fit-content"
    ></v-select>
    
    <v-icon
    icon="mdi-robot"
    size="x-small"
    />
    <v-select
    v-model="selectedModel"
    :items="availableChatModels"
    item-title="title"
    item-value="value"
    density="compact"
    variant="text"
    placeholder="Model"
    :menu-props="{ maxHeight: 'none' }"
    hide-details
    >
    <template v-slot:item="{ props: itemProps, item }">
        <v-list-item v-bind="itemProps" :subtitle="item.raw.subtitle"></v-list-item>
    </template>
</v-select>
</v-card-actions>
</v-card>

</v-tabs-window-item>
</v-tabs-window>
</v-container>

</template>

<script setup>
    import ChatCard from './ChatCard.vue'
    
    import { createLlmService } from '../../services/llmService'
    import { aiPreferencesStore } from '../../stores/aiPreferencesStore';
    import { useFoldersStore } from '../../stores/foldersStore';
    import chatRagPrompt from '../../prompts/chatRagPrompt';
    
    import { ref, nextTick, computed, onMounted, watch } from 'vue'
    
    const props = defineProps({
        "isChatFullscreen": {
            type: Boolean,
            default: false,
        }
    })
    
    const emit = defineEmits(['update:isChatFullscreen', 'update:isChatOpen']);
    
    // Store for AI preferences
    const aiStore = aiPreferencesStore();
    
    // Store for folders and notes
    const store = useFoldersStore()
    
    // Tabs for switching between favorite and recent notes
    const chatTab = 'chatTab'
    const tab = ref(chatTab)
    
    // Scopes for chat context
    const scopes = computed(() => {
        const baseScopes = [{ title: 'All notes', value: 'all' }]
        if (store.activeNoteId) {
            baseScopes.push({ title: 'Current note', value: 'current' })
        }
        return baseScopes
    })
    const currentScope = ref('all')
    
    const userInput = ref('')
    const defaultBotMessageText = 'Smart notes. Smarter you. What are we working on today?'
    const defaultBotMessage = {
        text: defaultBotMessageText,
        user: 'bot',
        bgColor: 'transparent',
        variant: 'flat',
        sources: [],
    }
    const generatingBotMessageText = 'Generating...'
    const generatingBotMessage = {
        text: generatingBotMessageText,
        user: 'bot',
        bgColor: 'transparent',
        variant: 'flat',
        sources: [],
    }
    const messages = ref([defaultBotMessage])
    
    const chatContainer = ref(null)
    
    // Computed height for chat container based on fullscreen state
    const chatContainerHeight = computed(() => {
        return props.isChatFullscreen ? 'calc(100vh - 380px)' : 'calc(100vh - 350px)'
    })
    
    // Available models for chat from all providers
    const availableChatModels = computed(() => {
        return aiStore.availableProviders.flatMap(provider => 
        aiStore.getProviderModels(provider).map(model => ({
            title: model,
            subtitle: provider,
            value: { provider, model }
        }))
        );
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
    
    // Load AI preferences on mount
    onMounted(() => {
        aiStore.loadPreferences();
    });
    
    // Watch for activeNoteId changes and reset scope if necessary
    watch(() => store.activeNoteId, (newActiveNoteId) => {
        if (!newActiveNoteId && currentScope.value === 'current') {
            currentScope.value = 'all';
        }
    });
    
    const resetChat = () => {
        messages.value = []
        messages.value.push(defaultBotMessage)
    }
    
    // Function to toggle chat expansion
    const toggleChatExpansion = () => {
        emit('update:isChatOpen', false)
        emit('update:isChatFullscreen', !props.isChatFullscreen)
    }
    
    const chunkDivederText = '\n\n-------\n\n'
    
    const sendMessage = async () => {
        try {
            if (userInput.value.trim() === '') return
            
            messages.value.push({
                text: userInput.value,
                user: 'user',
                bgColor: '',
                variant: 'tonal',
                sources: [],
            })
            
            // Scroll to the bottom of the chat container
            await nextTick()
            chatContainer.value.scrollTop = chatContainer.value.scrollHeight
            
            const userMessage = userInput.value
            userInput.value = ''
            
            // Search for similar notes
            var filter = {}
            
            console.log('Current scope:', currentScope.value)
            console.log('Active note ID:', store.activeNoteId)
            
            if (currentScope.value === 'current' && store.activeNoteId) {
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
            const botMessageIndex = messages.value.length
            messages.value.push({ 
                ...generatingBotMessage,
                sources: []
            })
            
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
            
            // Add citing information to the bot message
            notesForCiting.forEach((note) => {
                messages.value[botMessageIndex].sources.push({
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
            messages.value.push({
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
        width: 100%;
        overflow-y: auto;
        margin-bottom: 38px;
    }
</style>