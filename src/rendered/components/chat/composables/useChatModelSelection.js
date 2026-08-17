import { computed } from 'vue'
import { aiPreferencesStore } from '../../../stores/aiPreferencesStore'
import { buildModelItems, getProviderTitle } from '../../../utils/modelProviders'

export function useChatModelSelection() {
    const aiStore = aiPreferencesStore()

    const availableChatModels = computed(() => {
        return buildModelItems(aiStore.availableProviders, aiStore.getProviderModels)
    })

    const selectedModel = computed({
        get: () => ({
            provider: aiStore.chat.provider,
            model: aiStore.chat.model,
        }),
        set: (value) => {
            if (!value) return

            aiStore.setProvider('chat', value.provider)
            aiStore.setModel('chat', value.model)
        },
    })

    const selectModel = (modelValue) => {
        selectedModel.value = modelValue
    }

    const selectedModelTitle = computed(() => {
        const match = availableChatModels.value.find((item) => (
            item.value.provider === aiStore.chat.provider &&
            item.value.model === aiStore.chat.model
        ))

        if (!match) return 'Model'

        const reasoningEffort = aiStore.getModelReasoningEffort(
            'chat',
            match.value.provider,
            match.value.model,
        )
        const provider = getProviderTitle(match.value.provider)
        const reasoning = reasoningEffort === 'xhigh'
            ? 'Extra high'
            : reasoningEffort ? reasoningEffort.charAt(0).toUpperCase() + reasoningEffort.slice(1) : null

        return [provider, match.title, reasoning].filter(Boolean).join(' · ')
    })

    const loadModelPreferences = () => {
        aiStore.loadPreferences()
    }

    return {
        loadModelPreferences,
        availableChatModels,
        selectedModel,
        selectedModelTitle,
        selectModel,
    }
}
