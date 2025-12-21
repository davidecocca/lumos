<template>
    <div class="ma-2">
        <v-card
        class="rounded-md border ma-2"
        title="LLMs"
        subtitle="Your notes, your LLM: stay local or go hosted."
        rounded="lg"
        elevation="0"
        >
        
        <!-- Select model section -->
        <v-card-text class="mt-2">
            <!-- Editor basic tools -->
            <div class="d-flex align-center mb-2">
                <p class="text-subtitle-1">Editor basic tools</p>
                <v-tooltip text="Grammar check, improve writing, summarize, expand, simplify language, change tone, and translate tools" location="right">
                    <template v-slot:activator="{ props }">
                        <v-icon v-bind="props" size="small" class="ml-2">mdi-information-outline</v-icon>
                    </template>
                </v-tooltip>
            </div>
            <v-autocomplete
            label="Select provider and model"
            :items="providers.flatMap(provider => 
            getProviderModels(provider).map(model => ({
                title: `${provider} - ${model}`,
                value: { provider, model }
            }))
            )"
            v-model="editorBasicToolsSelection"
            item-title="title"
            clearable
            variant="outlined"
            ></v-autocomplete>
            
            <!-- Editor advanced tools -->
            <div class="d-flex align-center mb-2">
                <p class="text-subtitle-1">Editor advanced tools</p>
                <v-tooltip text="Format text tool" location="right">
                    <template v-slot:activator="{ props }">
                        <v-icon v-bind="props" size="small" class="ml-2">mdi-information-outline</v-icon>
                    </template>
                </v-tooltip>
            </div>
            <v-autocomplete
            label="Select provider and model"
            :items="providers.flatMap(provider => 
            getProviderModels(provider).map(model => ({
                title: `${provider} - ${model}`,
                value: { provider, model }
            }))
            )"
            v-model="editorAdvancedToolsSelection"
            item-title="title"
            clearable
            variant="outlined"
            ></v-autocomplete>
            
            <!-- Editor chat tools -->
            <div class="d-flex align-center mb-2">
                <p class="text-subtitle-1">Editor chat tools</p>
                <v-tooltip text="Brainstorm with AI & Ask AI tools" location="right">
                    <template v-slot:activator="{ props }">
                        <v-icon v-bind="props" size="small" class="ml-2">mdi-information-outline</v-icon>
                    </template>
                </v-tooltip>
            </div>
            <v-autocomplete
            label="Select provider and model"
            :items="providers.flatMap(provider => 
            getProviderModels(provider).map(model => ({
                title: `${provider} - ${model}`,
                value: { provider, model }
            }))
            )"
            v-model="editorChatToolsSelection"
            item-title="title"
            clearable
            variant="outlined"
            ></v-autocomplete>
            
            <!-- Chat -->
            <p class="text-subtitle-1 mb-2">Chat</p>
            <v-autocomplete
            label="Select provider and model"
            :items="providers.flatMap(provider => 
            getProviderModels(provider).map(model => ({
                title: `${provider} - ${model}`,
                value: { provider, model }
            }))
            )"
            v-model="chatSelection"
            item-title="title"
            clearable
            variant="outlined"
            ></v-autocomplete>
        </v-card-text>
    </v-card>
    
    <v-card
    class="rounded-md border ma-2 mt-8"
    title="Provider Settings"
    subtitle="Setup your API keys."
    rounded="lg"
    elevation="0"
    >
    <v-card-text>
        <div class="d-flex flex-column">
            <p class="text-subtitle-1 mb-2">Groq</p>
            <div class="d-flex align-top">
                <v-text-field
                label="API Key"
                :type="showGroqKey ? 'text' : 'password'"
                class="flex-grow-1 mr-4"
                v-model="groqApiKey"
                :append-inner-icon="showGroqKey ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append-inner="showGroqKey = !showGroqKey"
                @keydown.enter="saveGroqApiKey"
                variant="outlined"
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
            class="flex-grow-1 mr-4"
            v-model="openaiApiKey" 
            :append-inner-icon="showOpenAIKey ? 'mdi-eye' : 'mdi-eye-off'"
            @click:append-inner="showOpenAIKey = !showOpenAIKey"
            @keydown.enter="saveOpenAIApiKey"
            variant="outlined"
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
const editorBasicToolsSelection = computed({
    get: () => ({ 
        provider: aiStore.editorBasicTools.provider, 
        model: aiStore.editorBasicTools.model 
    }),
    set: (value) => {
        if (value) {
            aiStore.setProvider('editorBasicTools', value.provider);
            aiStore.setModel('editorBasicTools', value.model);
        }
    }
});

const editorAdvancedToolsSelection = computed({
    get: () => ({ 
        provider: aiStore.editorAdvancedTools.provider, 
        model: aiStore.editorAdvancedTools.model 
    }),
    set: (value) => {
        if (value) {
            aiStore.setProvider('editorAdvancedTools', value.provider);
            aiStore.setModel('editorAdvancedTools', value.model);
        }
    }
});

const editorChatToolsSelection = computed({
    get: () => ({ 
        provider: aiStore.editorChatTools.provider, 
        model: aiStore.editorChatTools.model 
    }),
    set: (value) => {
        if (value) {
            aiStore.setProvider('editorChatTools', value.provider);
            aiStore.setModel('editorChatTools', value.model);
        }
    }
});

const chatSelection = computed({
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