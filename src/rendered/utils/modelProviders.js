import groqLogo from '../assets/providers/groq.svg'
import ollamaLogo from '../assets/providers/ollama.svg'

export const providerMeta = {
    ollama: {
        logo: ollamaLogo,
        icon: 'ph-hard-drives',
    },
    groq: {
        logo: groqLogo,
        icon: 'ph-lightning',
    },
    openai: {
        icon: 'ph-open-ai-logo',
    },
}

export const getProviderLogo = (provider) => {
    return providerMeta[provider]?.logo || null
}

export const getProviderIcon = (provider) => {
    return providerMeta[provider]?.icon || 'ph-cpu'
}

export const getProviderLogoClass = (provider) => {
    return provider ? `model-provider-logo--${provider}` : null
}

export const buildModelItems = (providers, getProviderModels) => {
    return providers.flatMap((provider) =>
        getProviderModels(provider).map((item) => ({
            title: item.label,
            value: { provider, model: item.value },
        }))
    )
}

export const getSlotItemTitle = (item) => {
    return item?.raw?.title || item?.title || ''
}

export const getSlotItemProvider = (item) => {
    return item?.raw?.value?.provider || item?.value?.provider || null
}
