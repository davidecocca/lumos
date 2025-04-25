import { defineStore } from 'pinia'

export const aiPreferencesStore = defineStore('aiPreferences', {
    state: () => ({
        // Provider selections for different features
        editorTools: {
            provider: null,
            model: null
        },
        generateWithAI: {
            provider: null,
            model: null
        },
        chat: {
            provider: null,
            model: null
        },
        // API keys for different providers
        apiKeys: {
            groq: '',
            openai: ''
        },
        // Available providers and models
        availableProviders: ['ollama', 'groq', 'openai'],
        availableModels: {
            ollama: [],
            groq: ['llama3-8b-8192', 'llama3-70b-8192', 'mixtral-8x7b-32768', 'gemma-7b-it', 'meta-llama/llama-4-scout-17b-16e-instruct', 'meta-llama/llama-4-maverick-17b-128e-instruct'],
            openai: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o']
        }
    }),
    
    actions: {
        // Load preferences from localStorage
        loadPreferences() {
            const savedPrefs = localStorage.getItem('lumosAIPreferences')
            if (savedPrefs) {
                const preferences = JSON.parse(savedPrefs)
                
                // Load provider and model selections
                this.editorTools = preferences.editorTools || this.editorTools
                this.generateWithAI = preferences.generateWithAI || this.generateWithAI
                this.chat = preferences.chat || this.chat
                
                // Load API keys
                this.apiKeys = preferences.apiKeys || this.apiKeys
            }
        },
        
        // Save preferences to localStorage
        savePreferences() {
            const preferences = {
                editorTools: this.editorTools,
                generateWithAI: this.generateWithAI,
                chat: this.chat,
                apiKeys: this.apiKeys
            }
            
            localStorage.setItem('lumosAIPreferences', JSON.stringify(preferences))
        },
        
        // Set provider for a specific feature
        setProvider(feature, provider) {
            if (this[feature]) {
                this[feature].provider = provider
                // Reset model when changing provider
                this[feature].model = null
                this.savePreferences()
            }
        },
        
        // Set model for a specific feature
        setModel(feature, model) {
            if (this[feature]) {
                this[feature].model = model
                this.savePreferences()
            }
        },
        
        // Set API key for a specific provider
        setApiKey(provider, key) {
            if (this.apiKeys.hasOwnProperty(provider)) {
                this.apiKeys[provider] = key
                this.savePreferences()
            }
        },
        
        // Update available models for a provider
        updateAvailableModels(provider, models) {
            if (this.availableModels.hasOwnProperty(provider)) {
                this.availableModels[provider] = models
            }
        },
        
        // Get available models for a specific provider
        getProviderModels(provider) {
            return this.availableModels[provider] || []
        }
    }
})