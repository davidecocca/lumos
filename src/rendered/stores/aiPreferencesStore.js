import { defineStore } from 'pinia';

const normalizeOllamaModel = (model) => {
    if (!model) return null;
    if (typeof model === 'string') return model;
    if (typeof model === 'object' && typeof model.name === 'string') {
        return model.name;
    }
    return null;
};

const normalizeFeatureSelection = (selection, fallback) => {
    const normalizedSelection = {
        ...fallback,
        ...selection,
    };

    if (normalizedSelection.provider === 'ollama') {
        normalizedSelection.model = normalizeOllamaModel(
            normalizedSelection.model,
        );
    }

    return normalizedSelection;
};

const reasoningEffortKey = (feature, provider, model) =>
    `${feature}:${provider}:${model}`;

export const aiPreferencesStore = defineStore('aiPreferences', {
    state: () => ({
        // Provider selection for different features
        editor: {
            provider: null,
            model: null,
        },
        chat: {
            provider: null,
            model: null,
        },
        // API keys for different providers
        apiKeys: {
            groq: '',
            openai: '',
        },
        codexEnabled: false,
        modelReasoningEfforts: {},
        // Available providers and models
        availableProviders: ['ollama', 'groq', 'openai'],
        availableModels: {
            ollama: [],
            groq: [],
            openai: [
                { label: 'GPT-5.6 Sol', value: 'gpt-5.6-sol' },
                { label: 'GPT-5.6 Terra', value: 'gpt-5.6-terra' },
                { label: 'GPT-5.6 Luna', value: 'gpt-5.6-luna' },
                { label: 'GPT-5.5', value: 'gpt-5.5' },
                { label: 'GPT-5.4', value: 'gpt-5.4' },
                { label: 'GPT-5.4 Mini', value: 'gpt-5.4-mini' },
            ],
            codex: [],
        },
    }),

    actions: {
        // Load preferences from localStorage
        loadPreferences() {
            const savedPrefs = localStorage.getItem('lumosAIPreferences');
            if (savedPrefs) {
                const preferences = JSON.parse(savedPrefs);

                // Load provider and model selections
                this.editor = normalizeFeatureSelection(
                    preferences.editor,
                    this.editor,
                );
                this.chat = normalizeFeatureSelection(
                    preferences.chat,
                    this.chat,
                );

                // Load API keys
                this.apiKeys = preferences.apiKeys || this.apiKeys;
                this.codexEnabled = Boolean(preferences.codexEnabled);
                this.modelReasoningEfforts = Object.fromEntries(
                    Object.entries(
                        preferences.modelReasoningEfforts || {},
                    ).flatMap(([key, effort]) => {
                        if (
                            key.startsWith('editor:') ||
                            key.startsWith('chat:')
                        )
                            return [[key, effort]];
                        return ['editor', 'chat'].map((feature) => [
                            `${feature}:${key}`,
                            effort,
                        ]);
                    }),
                );
                if (
                    !preferences.modelReasoningEfforts &&
                    preferences.codexReasoningEffort
                ) {
                    for (const feature of ['editor', 'chat']) {
                        for (const model of [
                            'gpt-5.6-sol',
                            'gpt-5.6-terra',
                            'gpt-5.6-luna',
                        ]) {
                            this.modelReasoningEfforts[
                                reasoningEffortKey(feature, 'codex', model)
                            ] = preferences.codexReasoningEffort;
                        }
                    }
                }

                if (
                    this.codexEnabled &&
                    !this.availableProviders.includes('codex')
                ) {
                    this.availableProviders.push('codex');
                }

                this.savePreferences();
            }
        },

        // Save preferences to localStorage
        savePreferences() {
            const preferences = {
                editor: this.editor,
                chat: this.chat,
                apiKeys: this.apiKeys,
                codexEnabled: this.codexEnabled,
                modelReasoningEfforts: this.modelReasoningEfforts,
            };

            localStorage.setItem(
                'lumosAIPreferences',
                JSON.stringify(preferences),
            );
        },

        // Set provider for a specific feature
        setProvider(feature, provider) {
            if (this[feature]) {
                this[feature].provider = provider;
                // Reset model when changing provider
                this[feature].model = null;
                this.savePreferences();
            }
        },

        // Set model for a specific feature
        setModel(feature, model) {
            if (this[feature]) {
                this[feature].model = model;
                this.savePreferences();
            }
        },

        // Set API key for a specific provider
        setApiKey(provider, key) {
            if (this.apiKeys.hasOwnProperty(provider)) {
                this.apiKeys[provider] = key;
                this.savePreferences();
            }
        },

        setCodexEnabled(enabled, models = []) {
            this.codexEnabled = enabled;
            this.availableProviders = this.availableProviders.filter(
                (provider) => provider !== 'codex',
            );

            if (enabled) {
                this.availableProviders.push('codex');
                this.availableModels.codex = models;
            } else {
                this.availableModels.codex = [];
                for (const feature of ['editor', 'chat']) {
                    if (this[feature].provider === 'codex') {
                        this[feature] = { provider: null, model: null };
                    }
                }
            }
            this.savePreferences();
        },

        getModelReasoningEffort(feature, provider, model) {
            return (
                this.modelReasoningEfforts[
                    reasoningEffortKey(feature, provider, model)
                ] ||
                this.getProviderModels(provider).find(
                    (item) => item.value === model,
                )?.defaultReasoningEffort ||
                null
            );
        },

        setModelReasoningEffort(feature, provider, model, reasoningEffort) {
            this.modelReasoningEfforts[
                reasoningEffortKey(feature, provider, model)
            ] = reasoningEffort;
            this.savePreferences();
        },

        // Generate label for Ollama models
        generateOllamaLabel(model) {
            const fullName = model.name;
            const size = model.size;
            const [name] = fullName.split(':');
            return `${name} (${size})`;
        },

        // Update available models for a provider
        updateAvailableModels(provider, models) {
            if (this.availableModels.hasOwnProperty(provider)) {
                if (provider === 'ollama') {
                    this.availableModels[provider] = models.map((model) => ({
                        label: this.generateOllamaLabel(model),
                        value: model.name,
                    }));
                } else {
                    this.availableModels[provider] = models;
                }
            }
        },

        // Get available models for a specific provider
        getProviderModels(provider) {
            return this.availableModels[provider] || [];
        },
    },
});
