import { defineStore } from 'pinia'

export const aiPreferencesStore = defineStore('aiPreferences', {
    state: () => ({
        // Provider selection for different features
        editor: {
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
        availableProviders: [
            'ollama',
            'groq',
            'openai'
        ],
        availableModels: {
            ollama: [],
            groq: [
                'moonshotai/kimi-k2-instruct',
                'moonshotai/kimi-k2-instruct-0905',
                'openai/gpt-oss-120b',
                'openai/gpt-oss-20b',
                'llama-3.1-8b-instant',
                'llama3-70b-8192',
                'meta-llama/llama-4-scout-17b-16e-instruct',
                'meta-llama/llama-4-maverick-17b-128e-instruct',
                'groq/compound',
                'groq/compound-mini',
                'qwen-qwq-32b'
            ],
            openai: [
                'gpt-4o',
                'gpt-4o-mini',
                'gpt-4.1',
                'gpt-4.1-mini',
                'gpt-4.1-nano',
                'o4-mini'
            ]
        }
    }),
    
    actions: {
        // Load preferences from localStorage
        loadPreferences() {
            const savedPrefs = localStorage.getItem('lumosAIPreferences')
            if (savedPrefs) {
                const preferences = JSON.parse(savedPrefs)
                
                // Load provider and model selections
                this.editor = preferences.editor || this.editor
                this.chat = preferences.chat || this.chat
                
                // Load API keys
                this.apiKeys = preferences.apiKeys || this.apiKeys
            }
        },
        
        // Save preferences to localStorage
        savePreferences() {
            const preferences = {
                editor: this.editor,
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