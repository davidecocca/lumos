import { ChatOllama } from "@langchain/ollama";
import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { aiPreferencesStore } from '../stores/aiPreferencesStore';

const ollamaBaseUrl = "http://localhost:11434";
const ollamaListModelsUrl = `${ollamaBaseUrl}/api/tags`;

/**
* Service for interacting with LLM models
*/
class LlmService {
    constructor() {
        this.llm = new ChatOllama({
            model: "gemma3:4b",
            temperature: 0,
            maxRetries: 2,
        });
        
        this.prompt = ChatPromptTemplate.fromMessages([
            ["system", "You are a helpful assistant."],
            ["human", "{input}"],
        ]);
        
        this.chain = this.prompt.pipe(this.llm);
    }
    
    /**
    * Send a message to the LLM and get a response
    * @param {string} message - The user's message
    * @returns {Promise<object>} - The LLM's response
    */
    async generate(message) {
        try {
            const response = await this.chain.invoke({
                input: message,
            });
            return response.content;
        } catch (error) {
            console.error("Error communicating with LLM:", error);
            throw error;
        }
    }
    
    /**
    * Stream responses from the LLM
    * @param {string} message - The user's message
    * @returns {AsyncGenerator<string>} - Generator yielding response chunks
    */
    async *stream(message) {
        try {
            const stream = await this.chain.stream({
                input: message,
            });
            
            for await (const chunk of stream) {
                yield chunk.content;
            }
        } catch (error) {
            console.error("Error streaming from LLM:", error);
            throw error;
        }
    }
    
    /**
    * Customize the system prompt
    * @param {string} systemPrompt - The new system prompt
    */
    setSystemPrompt(systemPrompt) {
        this.prompt = ChatPromptTemplate.fromMessages([
            ["system", systemPrompt],
            ["human", "{input}"],
        ]);
        this.chain = this.prompt.pipe(this.llm);
    }
    
    async getOllamaModels() {
        try {
            const response = await fetch(ollamaListModelsUrl);
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            const models = await response.json();
            const modelNames = models.models.map(model => model.name);
            return modelNames;
        } catch (error) {
            console.error("Error fetching models:", error);
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
    const service = new LlmService();
    const aiStore = aiPreferencesStore();
    
    // Set custom system prompt
    service.setSystemPrompt(systemPrompt || "You are a helpful assistant.");
    
    // Get settings from store based on feature
    const featureSettings = aiStore[feature];
    const provider = featureSettings?.provider;
    const model = featureSettings?.model;
    
    // Configure LLM based on provider and model
    if (provider === 'ollama' && model) {
        service.llm = new ChatOllama({
            model: model,
            temperature: options.temperature !== undefined ? options.temperature : 0,
            maxRetries: options.maxRetries !== undefined ? options.maxRetries : 2,
        });
    }
    else if (provider === 'groq' && model) {
        service.llm = new ChatGroq({
            model: model,
            temperature: options.temperature !== undefined ? options.temperature : 0,
            maxRetries: options.maxRetries !== undefined ? options.maxRetries : 2,
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