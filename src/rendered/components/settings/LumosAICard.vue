<template>
    <!-- Model selection card -->
    <v-card
    class="rounded-md border"
    title="Models"
    subtitle="Your notes, your LLM: stay local or go hosted."
    rounded="lg"
    elevation="0"
    >
    
    <v-card-text class="mt-2">
        <v-select
        class="model-select"
        label="Editor"
        :items="modelItems"
        v-model="editorSelection"
        clearable
        variant="outlined"
        density="comfortable"
        rounded="lg"
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
    
    <v-select
    class="model-select"
    label="Chat"
    :items="modelItems"
    v-model="chatSelection"
    clearable
    variant="outlined"
    density="comfortable"
    rounded="lg"
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

<!-- API keys card -->
<v-card
class="rounded-md border mt-4"
title="Providers"
subtitle="Setup your API keys."
rounded="lg"
elevation="0"
>
<v-card-text class="mt-2">
    <v-text-field
    label="Groq"
    :type="showGroqKey ? 'text' : 'password'"
    class="flex-grow-1"
    v-model="groqApiKey"
    :append-inner-icon="showGroqKey ? 'ph-eye' : 'ph-eye-slash'"
    @click:append-inner="showGroqKey = !showGroqKey"
    variant="outlined"
    density="comfortable"
    rounded="lg"
    />
    <v-text-field
    label="OpenAI"
    :type="showOpenAIKey ? 'text' : 'password'"
    class="flex-grow-1"
    v-model="openaiApiKey" 
    :append-inner-icon="showOpenAIKey ? 'ph-eye' : 'ph-eye-slash'"
    @click:append-inner="showOpenAIKey = !showOpenAIKey"
    variant="outlined"
    density="comfortable"
    rounded="lg"
    />
</v-card-text>
</v-card>
</template>

<script setup>
import { buildModelItems, getSlotItemProvider, getSlotItemTitle } from '../../utils/modelProviders'
import { aiPreferencesStore } from '../../stores/aiPreferencesStore';
import ModelProviderMark from '../ai/ModelProviderMark.vue'

import { computed, onMounted, ref, watch } from 'vue';

const aiStore = aiPreferencesStore();

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
const hasLoadedApiKeys = ref(false);

const providers = computed(() => aiStore.availableProviders);

const getProviderModels = (provider) => {
    if (!provider) return [];
    return aiStore.getProviderModels(provider);
};

const modelItems = computed(() => buildModelItems(providers.value, getProviderModels));

watch(groqApiKey, (key) => {
    if (hasLoadedApiKeys.value && key !== aiStore.apiKeys.groq) {
        aiStore.setApiKey('groq', key);
    }
});

watch(openaiApiKey, (key) => {
    if (hasLoadedApiKeys.value && key !== aiStore.apiKeys.openai) {
        aiStore.setApiKey('openai', key);
    }
});

onMounted(() => {    
    groqApiKey.value = aiStore.apiKeys.groq;
    openaiApiKey.value = aiStore.apiKeys.openai;
    hasLoadedApiKeys.value = true;
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
