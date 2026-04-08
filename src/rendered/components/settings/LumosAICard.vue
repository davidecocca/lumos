<template>
    <div class="ma-2">
        <v-card
        class="rounded-md border ma-2"
        title="Models"
        subtitle="Your notes, your LLM: stay local or go hosted."
        rounded="lg"
        elevation="0"
        >
        
        <!-- Select model section -->
        <v-card-text class="mt-2">
            <!-- Editor -->
            <v-select
            class="model-select"
            label="Editor"
            :items="modelItems"
            v-model="editorSelection"
            clearable
            variant="outlined"
            >
            <template v-slot:item="{ props: itemProps, item }">
                <v-list-item v-bind="itemProps" :title="getSlotItemTitle(item)">
                    <template v-slot:prepend>
                        <ModelProviderMark :provider="getSlotItemProvider(item)" class="me-3" />
                    </template>
                </v-list-item>
            </template>
            <template v-slot:selection="{ item }">
                <span class="model-selection-label">{{ getSlotItemTitle(item) }}</span>
            </template>
        </v-select>
        
        <!-- Chat -->
        <v-select
        class="model-select"
        label="Chat"
        :items="modelItems"
        v-model="chatSelection"
        clearable
        variant="outlined"
        >
        <template v-slot:item="{ props: itemProps, item }">
            <v-list-item v-bind="itemProps" :title="getSlotItemTitle(item)">
                <template v-slot:prepend>
                    <ModelProviderMark :provider="getSlotItemProvider(item)" class="me-3" />
                </template>
            </v-list-item>
        </template>
        <template v-slot:selection="{ item }">
            <span class="model-selection-label">{{ getSlotItemTitle(item) }}</span>
        </template>
    </v-select>
</v-card-text>
</v-card>

<v-card
class="rounded-md border ma-2 mt-8"
title="Providers"
subtitle="Setup your API keys."
rounded="lg"
elevation="0"
>
<v-card-text class="mt-2">
    <div class="d-flex flex-column">
        <div class="d-flex align-top">
            <v-text-field
            label="Groq"
            :type="showGroqKey ? 'text' : 'password'"
            class="flex-grow-1 mr-4"
            v-model="groqApiKey"
            :append-inner-icon="showGroqKey ? 'ph-eye' : 'ph-eye-slash'"
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
    <div class="d-flex align-top">
        <v-text-field
        label="OpenAI"
        :type="showOpenAIKey ? 'text' : 'password'"
        class="flex-grow-1 mr-4"
        v-model="openaiApiKey" 
        :append-inner-icon="showOpenAIKey ? 'ph-eye' : 'ph-eye-slash'"
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
    import ModelProviderMark from '../ai/ModelProviderMark.vue'
    import { aiPreferencesStore } from '../../stores/aiPreferencesStore';
    import { buildModelItems, getSlotItemProvider, getSlotItemTitle } from '../../utils/modelProviders'
    
    const aiStore = aiPreferencesStore();
    
    // Computed properties to bind to the UI
    const editorSelection = computed({
        get: () => ({ 
            provider: aiStore.editor.provider, 
            model: aiStore.editor.model 
        }),
        set: (value) => {
            if (value) {
                aiStore.setProvider('editor', value.provider);
                aiStore.setModel('editor', value.model);
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

    const modelItems = computed(() => buildModelItems(providers.value, getProviderModels));
    
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

<style scoped>
.model-selection-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.model-select :deep(.v-select__selection) {
    min-width: 0;
    max-width: 100%;
}
</style>
