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
                { label: 'Kimi K2', value: 'moonshotai/kimi-k2-instruct' },
                { label: 'Kimi K2 (0905)', value: 'moonshotai/kimi-k2-instruct-0905' },
                { label: 'GPT OSS 120B', value: 'openai/gpt-oss-120b' },
                { label: 'GPT OSS 20B', value: 'openai/gpt-oss-20b' },
                { label: 'Llama 3.1 8B', value: 'llama-3.1-8b-instant' },
                { label: 'Llama 3 70B', value: 'llama3-70b-8192' },
                { label: 'Llama 4 Scout', value: 'meta-llama/llama-4-scout-17b-16e-instruct' },
                { label: 'Llama 4 Maverick', value: 'meta-llama/llama-4-maverick-17b-128e-instruct' },
                { label: 'Groq Compound', value: 'groq/compound' },
                { label: 'Groq Compound Mini', value: 'groq/compound-mini' },
                { label: 'Qwen3 32B', value: 'qwen-qwq-32b' }
            ],
            openai: [
                { label: 'GPT-5.2', value: 'gpt-5.2' },
                { label: 'GPT-5.1', value: 'gpt-5.1' },
                { label: 'GPT-5', value: 'gpt-5' },
                { label: 'GPT-5 Mini', value: 'gpt-5-mini' },
                { label: 'GPT-5 Nano', value: 'gpt-5-nano' },
                { label: 'GPT-5.1 Codex', value: 'gpt-5.1-codex' },
                { label: 'GPT-4.1', value: 'gpt-4.1' },
                { label: 'GPT-4.1 Mini', value: 'gpt-4.1-mini' },
                { label: 'GPT-4.1 Nano', value: 'gpt-4.1-nano' },
            ]
        },
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
        
        // Generate label for Ollama models
        generateOllamaLabel(model) {
            const fullName = model.name
            const size = model.size
            const [name, tag] = fullName.split(':')
            return `${name} (${size})`
        },
        
        // Update available models for a provider
        updateAvailableModels(provider, models) {
            if (this.availableModels.hasOwnProperty(provider)) {
                if (provider === 'ollama') {
                    this.availableModels[provider] = models.map(model => ({ label: this.generateOllamaLabel(model), value: model }))
                } else {
                    this.availableModels[provider] = models
                }
            }
        },
        
        // Get available models for a specific provider
        getProviderModels(provider) {
            return this.availableModels[provider] || []
        }
    }
})