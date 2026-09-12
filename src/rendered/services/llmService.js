import { ChatOllama } from '@langchain/ollama';
import { ChatGroq } from '@langchain/groq';
import {
    ChatPromptTemplate,
    MessagesPlaceholder,
} from '@langchain/core/prompts';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { aiPreferencesStore } from '../stores/aiPreferencesStore';
import { CodexLlmService } from './providers/codexLlmService';

const ollamaBaseUrl = 'http://localhost:11434';
const ollamaListModelsUrl = `${ollamaBaseUrl}/api/tags`;
const defaultChatHistoryCharacterLimit = 8000;

const normalizeModelForProvider = (provider, model) => {
    if (provider !== 'ollama') return model;
    if (typeof model === 'string') return model;
    if (typeof model === 'object' && typeof model?.name === 'string') {
        return model.name;
    }
    return null;
};

export const createChatHistoryMessages = (
    messages = [],
    characterLimit = defaultChatHistoryCharacterLimit,
) => {
    const normalizedMessages = messages
        .map((message) => {
            const content = String(
                message?.text || message?.content || '',
            ).trim();
            if (!content || content === 'Generating...') return null;

            if (message?.user === 'user' || message?.role === 'user') {
                return {
                    characterCount: content.length,
                    message: new HumanMessage(content),
                };
            }

            if (message?.user === 'bot' || message?.role === 'assistant') {
                return {
                    characterCount: content.length,
                    message: new AIMessage(content),
                };
            }

            return null;
        })
        .filter(Boolean);

    const trimmedMessages = [];
    let totalCharacters = 0;

    for (let index = normalizedMessages.length - 1; index >= 0; index -= 1) {
        const nextMessage = normalizedMessages[index];
        if (
            trimmedMessages.length > 0 &&
            totalCharacters + nextMessage.characterCount > characterLimit
        ) {
            break;
        }

        trimmedMessages.unshift(nextMessage.message);
        totalCharacters += nextMessage.characterCount;
    }

    return trimmedMessages;
};

/**
 * Service for interacting with LLM models
 */
class LlmService {
    constructor() {
        this.llm = new ChatOllama({
            model: 'llama3.2:3b',
            temperature: 0,
            maxRetries: 2,
        });

        this.prompt = ChatPromptTemplate.fromMessages([
            ['system', 'You are a helpful assistant.'],
            new MessagesPlaceholder('history'),
            ['human', '{input}'],
        ]);

        this.chain = this.prompt.pipe(this.llm);
    }

    /**
     * Send a message to the LLM and get a response
     * @param {string} message - The user's message
     * @returns {Promise<object>} - The LLM's response
     */
    async generate(message, history = []) {
        try {
            const response = await this.chain.invoke({
                input: message,
                history,
            });
            return response.content;
        } catch (error) {
            console.error('Error communicating with LLM:', error);
            throw error;
        }
    }

    /**
     * Stream responses from the LLM
     * @param {string} message - The user's message
     * @returns {AsyncGenerator<string>} - Generator yielding response chunks
     */
    async *stream(message, history = []) {
        try {
            const stream = await this.chain.stream({
                input: message,
                history,
            });

            for await (const chunk of stream) {
                yield chunk.content;
            }
        } catch (error) {
            console.error('Error streaming from LLM:', error);
            throw error;
        }
    }

    /**
     * Customize the system prompt
     * @param {string} systemPrompt - The new system prompt
     */
    setSystemPrompt(systemPrompt) {
        this.prompt = ChatPromptTemplate.fromMessages([
            ['system', systemPrompt],
            new MessagesPlaceholder('history'),
            ['human', '{input}'],
        ]);
        this.chain = this.prompt.pipe(this.llm);
    }

    async getOllamaModels() {
        try {
            const response = await fetch(ollamaListModelsUrl);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const models = await response.json();
            const modelNames = models.models.map((model) => ({
                name: model.name,
                size: model.details.parameter_size,
            }));
            return modelNames;
        } catch (error) {
            console.error('Error fetching models:', error);
            throw error;
        }
    }
}

/**
 * Create a custom instance of LlmService with a specific prompt
 * @param {string} systemPrompt - The system prompt to use
 * @param {string} feature - The feature for which the LLM is being configured (e.g., 'chat')
 * @param {object} options - Optional configuration for the LLM (model, temperature, etc.)
 * @returns {LlmService} - A configured LlmService instance
 */
export function createLlmService(systemPrompt, feature = 'chat', options = {}) {
    const aiStore = aiPreferencesStore();
    const featureSettings = aiStore[feature];
    const provider = featureSettings?.provider;
    const model = normalizeModelForProvider(provider, featureSettings?.model);

    if (provider === 'codex' && model) {
        return new CodexLlmService(
            systemPrompt || 'You are a helpful assistant.',
            model,
            aiStore.getModelReasoningEffort(feature, 'codex', model),
        );
    }

    const service = new LlmService();

    // Set custom system prompt
    service.setSystemPrompt(systemPrompt || 'You are a helpful assistant.');

    // Configure LLM based on provider and model
    if (provider === 'ollama' && model) {
        service.llm = new ChatOllama({
            model: model,
            temperature:
                options.temperature !== undefined ? options.temperature : 0,
            maxRetries:
                options.maxRetries !== undefined ? options.maxRetries : 2,
        });
    } else if (provider === 'groq' && model) {
        service.llm = new ChatGroq({
            model: model,
            temperature:
                options.temperature !== undefined ? options.temperature : 0,
            maxRetries:
                options.maxRetries !== undefined ? options.maxRetries : 2,
            apiKey: aiStore.apiKeys.groq,
        });
    } else if (provider === 'openai' && model) {
        // Configure OpenAI LLM here
        // service.llm = new OpenAILLM({ model, ...options });
    } else {
        throw new Error(`Unsupported provider: ${provider}`);
    }

    // Rebuild the chain with new LLM
    service.chain = service.prompt.pipe(service.llm);

    return service;
}

// Export a singleton instance
export const llmService = new LlmService();

// Also export the class if needed for testing or custom instances
export default LlmService;
