<template>
    <div class="d-flex flex-column align-center">
        <!-- Page title -->
        <div class="d-flex flex-column align-center mt-2 mb-4">
            <p class="text-h4 font-weight-medium">Lumos AI</p>
            <p class="text-h6 font-weight-light">Chat with your notes.</p>
        </div>
        
        <div class="d-flex flex-column ml-4 pl-4" style="align-self: flex-start;">
            <!-- New chat button -->
            <v-tooltip text="Clear this thread and start a new conversation">
                <template v-slot:activator="{ props }">
                    <v-btn
                    v-bind="props"
                    variant="tonal"
                    color="primary"
                    rounded="lg"
                    prepend-icon="mdi-plus"
                    @click="resetChat"
                    >New chat</v-btn>
                </template>
            </v-tooltip>
        </div>
        
        <div class="chat-container" ref="chatContainer">
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

<div class="notes-filter-container">
    <div v-if="filterNotes.length > 0" class="mb-4">
        <v-slide-group show-arrows>
            <v-slide-group-item
            v-for="note in filterNotes"
            :key="note.id"
            >
            <v-chip
            closable
            class="ml-1 mr-1"
            @click:close="filterNotes = filterNotes.filter(n => n.id !== note.id)"
            >
            {{ note.title }}
        </v-chip>
    </v-slide-group-item>
</v-slide-group>
</div>
</div>

<div class="chat-input plr-0">
    <v-text-field
    v-model="userInput"
    label="Ask something"
    variant="solo"
    hide-details
    rounded
    clearable
    single-line
    @keyup.enter="sendMessage"
    class="ma-4"
    >
    <template v-slot:append-inner>
        <v-tooltip text="Send" location="top">
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
    <template v-slot:prepend-inner>
        <v-menu v-model="menu" :close-on-content-click="false">
            <template v-slot:activator="{ props }">
                <v-tooltip text="Restrict search" location="top">
                    <template v-slot:activator="{ props: tooltipProps }">
                        <v-icon
                        v-bind="{ ...props, ...tooltipProps }"
                        icon="mdi-filter"
                        @click="loadNotes()"
                        />
                    </template>
                </v-tooltip>
            </template>
            <v-list>
                <v-list-subheader>Limit search to selected notes</v-list-subheader>
                <v-list-item
                v-for="note in notes"
                :key="note.id"
                @click="addNoteToFilter(note)"
                >
                <v-list-item-title>{{ note.title }}</v-list-item-title>
                <v-list-item-subtitle>{{ note.folder_name }}</v-list-item-subtitle>
                <template v-slot:append>
                    <v-icon icon="mdi-filter-plus-outline" size="small"/>
                </template>
            </v-list-item>
        </v-list>
    </v-menu>
</template>
</v-text-field>
</div>
</div>

</template>

<script setup>
    import ChatCard from '../components/chat/ChatCard.vue'
    
    import { createLlmService } from '../services/llmService'
    import chatRagPrompt from '../prompts/chatRagPrompt';
    
    import { ref, nextTick } from 'vue'
    
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
    const notes = ref([])
    const menu = ref(false)
    const filterNotes = ref([])
    
    const chatContainer = ref(null)
    
    const resetChat = () => {
        messages.value = []
        messages.value.push(defaultBotMessage)
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
            var sources = []
            if (filterNotes.value.length > 0) {
                filterNotes.value.forEach((note) => {
                    sources.push(note.id)
                })
            }
            const payload = {
                query: userMessage,
                sources: sources,
            }
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
    
    const loadNotes = async () => {
        try {
            notes.value = await window.api.listNotes()
        } catch (error) {
            console.error('An error occurred while loading notes:', error)
        }
    }
    
    const addNoteToFilter = (note) => {
        if (!filterNotes.value.includes(note)) {
            filterNotes.value.push(note)
        }
    }
</script>

<style scoped>
    .chat-container {
        width: 100%;
        height: calc(100vh - 404px);
        overflow-y: auto;
        padding: 16px;
        margin-bottom: 38px;
    }
    
    .chat-input {
        width: 100%;
        max-width: 1000px;
    }
    
    .notes-filter-container {
        min-height: 64px;
        width: 100%;
        max-width: 800px;
    }
</style>