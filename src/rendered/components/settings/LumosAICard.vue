<template>
    <div class="ma-2">
        <div class="d-flex align-center pt-4 pb-4 pl-2 pr-2">
            <v-icon class="mr-2">mdi-lightning-bolt</v-icon>
            <p class="text-h6">Lumos AI</p>
        </div>
        <v-card
        class="rounded-md border ma-2"
        title="LLMs"
        subtitle="Your notes, your LLM: stay local or go hosted."
        >
        
        <!-- Select model section -->
        <v-card-text class="mt-2">
            <!-- Select LLM for editor basic tools -->
            <div class="d-flex align-center mb-2">
                <p class="text-subtitle-1">Editor basic tools</p>
                <v-tooltip text="Grammar check, improve writing, summarize, expand, simplify language, change tone, and translate tools" location="right">
                    <template v-slot:activator="{ props }">
                        <v-icon v-bind="props" size="small" class="ml-2">mdi-information-outline</v-icon>
                    </template>
                </v-tooltip>
            </div>
            <div class="d-flex flex-column">
                <div class="d-flex">
                    <div class="flex-1 mr-2" style="width: 50%">
                        <v-select
                        label="Select provider"
                        :items="providers"
                        v-model="editorBasicToolsSelectedProvider"
                        clearable
                        ></v-select>
                    </div>
                    
                    <div class="flex-1" style="width: 50%" v-if="editorToolsSelectedProvider !== null">
                        <v-select
                        label="Select model"
                        :items="getProviderModels(editorBasicToolsSelectedProvider)"
                        v-model="editorBasicToolsSelectedModel"
                        clearable
                        ></v-select>
                    </div>
                </div>
            </div>
            
            <!-- Select LLM for editor advanced tools -->
            <div class="d-flex align-center mb-2">
                <p class="text-subtitle-1">Editor advanced tools</p>
                <v-tooltip text="Format text tool" location="right">
                    <template v-slot:activator="{ props }">
                        <v-icon v-bind="props" size="small" class="ml-2">mdi-information-outline</v-icon>
                    </template>
                </v-tooltip>
            </div>
            <div class="d-flex flex-column">
                <div class="d-flex">
                    <div class="flex-1 mr-2" style="width: 50%">
                        <v-select
                        label="Select provider"
                        :items="providers"
                        v-model="editorAdvancedToolsSelectedProvider"
                        clearable
                        ></v-select>
                    </div>
                    
                    <div class="flex-1" style="width: 50%" v-if="editorToolsSelectedProvider !== null">
                        <v-select
                        label="Select model"
                        :items="getProviderModels(editorAdvancedToolsSelectedProvider)"
                        v-model="editorAdvancedToolsSelectedModel"
                        clearable
                        ></v-select>
                    </div>
                </div>
            </div>
            
            <!-- Select LLM for editor chat tool-->
            <div class="d-flex align-center mb-2">
                <p class="text-subtitle-1">Editor chat tools</p>
                <v-tooltip text="Brainstorm with AI & Ask AI tools" location="right">
                    <template v-slot:activator="{ props }">
                        <v-icon v-bind="props" size="small" class="ml-2">mdi-information-outline</v-icon>
                    </template>
                </v-tooltip>
            </div>
            <div class="d-flex flex-column">
                <div class="d-flex">
                    <div class="flex-1 mr-2" style="width: 50%">
                        <v-select
                        label="Select provider"
                        :items="providers"
                        v-model="editorChatToolsSelectedProvider"
                        clearable
                        ></v-select>
                    </div>
                    
                    <div class="flex-1" style="width: 50%" v-if="generateWithAISelectedProvider !== null">
                        <v-select
                        label="Select model"
                        :items="getProviderModels(editorChatToolsSelectedProvider)"
                        v-model="editorChatToolsSelectedModel"
                        clearable
                        ></v-select>
                    </div>
                </div>
            </div>
            
            <!-- Select LLM for chat -->
            <p class="text-subtitle-1 mb-2">Chat</p>
            <div class="d-flex flex-column">
                <div class="d-flex">
                    <div class="flex-1 mr-2" style="width: 50%">
                        <v-select
                        label="Select provider"
                        :items="providers"
                        v-model="chatSelectedProvider"
                        clearable
                        ></v-select>
                    </div>
                    
                    <div class="flex-1" style="width: 50%" v-if="chatSelectedProvider !== null">
                        <v-select
                        label="Select model"
                        :items="getProviderModels(chatSelectedProvider)"
                        v-model="chatSelectedModel"
                        clearable
                        ></v-select>
                    </div>
                </div>
            </div>
            
            <v-divider class="mt-2"></v-divider>
            
            <!-- Provider settings -->
            <p class="text-h6 mt-6">Provider Settings</p>
            <p class="text-subtitle-2 text-medium-emphasis mb-4">Set your API keys</p>
            
            <div class="d-flex flex-column">
                <p class="text-subtitle-1 mb-2">Groq</p>
                <div class="d-flex align-top">
                    <v-text-field
                    label="API Key"
                    :type="showGroqKey ? 'text' : 'password'"
                    class="flex-grow-1 mr-2"
                    v-model="groqApiKey"
                    :append-inner-icon="showGroqKey ? 'mdi-eye' : 'mdi-eye-off'"
                    @click:append-inner="showGroqKey = !showGroqKey"
                    @keydown.enter="saveGroqApiKey"
                    ></v-text-field>
                    <v-btn
                    color="primary"
                    variant="tonal"
                    @click="saveGroqApiKey"
                    height="56"
                    >
                    Save
                </v-btn>
            </div>
        </div>
        
        <div class="d-flex flex-column">
            <p class="text-subtitle-1 mb-2">OpenAI</p>
            <div class="d-flex align-top">
                <v-text-field
                label="API Key"
                :type="showOpenAIKey ? 'text' : 'password'"
                class="flex-grow-1 mr-2"
                v-model="openaiApiKey" 
                :append-inner-icon="showOpenAIKey ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append-inner="showOpenAIKey = !showOpenAIKey"
                @keydown.enter="saveOpenAIApiKey"
                ></v-text-field>
                <v-btn
                color="primary"
                variant="tonal"
                @click="saveOpenAIApiKey"
                height="56"
                >
                Save
            </v-btn>
        </div>
    </div>
    
</v-card-text>
</v-card>
</div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue';
import { aiPreferencesStore } from '../../stores/aiPreferencesStore';

const aiStore = aiPreferencesStore();

// Computed properties to bind to the UI
const editorBasicToolsSelectedProvider = computed({
    get: () => aiStore.editorBasicTools.provider,
    set: (value) => aiStore.setProvider('editorBasicTools', value)
});

const editorBasicToolsSelectedModel = computed({
    get: () => aiStore.editorBasicTools.model,
    set: (value) => aiStore.setModel('editorBasicTools', value)
});

const editorAdvancedToolsSelectedProvider = computed({
    get: () => aiStore.editorAdvancedTools.provider,
    set: (value) => aiStore.setProvider('editorAdvancedTools', value)
});

const editorAdvancedToolsSelectedModel = computed({
    get: () => aiStore.editorAdvancedTools.model,
    set: (value) => aiStore.setModel('editorAdvancedTools', value)
});

const editorChatToolsSelectedProvider = computed({
    get: () => aiStore.editorChatTools.provider,
    set: (value) => aiStore.setProvider('editorChatTools', value)
});

const editorChatToolsSelectedModel = computed({
    get: () => aiStore.editorChatTools.model,
    set: (value) => aiStore.setModel('editorChatTools', value)
});

const chatSelectedProvider = computed({
    get: () => aiStore.chat.provider,
    set: (value) => aiStore.setProvider('chat', value)
});

const chatSelectedModel = computed({
    get: () => aiStore.chat.model,
    set: (value) => aiStore.setModel('chat', value)
});

const groqApiKey = ref('');
const openaiApiKey = ref('');
const showGroqKey = ref(false);
const showOpenAIKey = ref(false);

const providers = computed(() => aiStore.availableProviders);

const getProviderModels = (provider) => {
    if (!provider) return [];
    return aiStore.getProviderModels(provider);
};

const saveGroqApiKey = () => {
    aiStore.setApiKey('groq', groqApiKey.value);
};

const saveOpenAIApiKey = () => {
    aiStore.setApiKey('openai', openaiApiKey.value);
};

onMounted(() => {    
    // Set the input fields with any saved API keys for editing
    groqApiKey.value = aiStore.apiKeys.groq;
    openaiApiKey.value = aiStore.apiKeys.openai;
});
</script>