const groqListModelsUrl = 'https://api.groq.com/openai/v1/models';

const groqChatModels = [
    { label: 'GPT OSS 120B', value: 'openai/gpt-oss-120b' },
    { label: 'GPT OSS 20B', value: 'openai/gpt-oss-20b' },
    { label: 'Groq Compound', value: 'groq/compound' },
    { label: 'Groq Compound Mini', value: 'groq/compound-mini' },
    { label: 'Qwen3.6 27B', value: 'qwen/qwen3.6-27b' },
];

export const getGroqModels = async (apiKey) => {
    if (!apiKey?.trim()) return [];

    const response = await fetch(groqListModelsUrl, {
        headers: {
            Authorization: `Bearer ${apiKey.trim()}`,
        },
    });
    if (!response.ok) {
        throw new Error('Unable to load Groq models. Check your API key.');
    }

    const payload = await response.json();
    const activeModelIds = new Set(
        (payload.data || [])
            .filter((model) => model?.id && model.active !== false)
            .map((model) => model.id),
    );

    return groqChatModels.filter((model) => activeModelIds.has(model.value));
};
