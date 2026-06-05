import { computed } from 'vue'
import { aiPreferencesStore } from '../../../stores/aiPreferencesStore'
import { buildModelItems } from '../../../utils/modelProviders'

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

        return match?.title || 'Model'
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
