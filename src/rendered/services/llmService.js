import { ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";

/**
* Service for interacting with LLM models
*/
class LlmService {
    constructor() {
        this.llm = new ChatOllama({
            model: "phi4:latest",
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
    async sendMessage(message) {
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
}

/**
* Create a custom instance of LlmService with a specific prompt
* @param {string} systemPrompt - The system prompt to use
* @param {object} options - Optional configuration for the LLM (model, temperature, etc.)
* @returns {LlmService} - A configured LlmService instance
*/
export function createLlmService(systemPrompt, options = {}) {
    const service = new LlmService();
    
    // Set custom system prompt
    service.setSystemPrompt(systemPrompt || "You are a helpful assistant.");
    
    // Configure custom model options if provided
    if (options.model || options.temperature !== undefined || options.maxRetries !== undefined) {
        service.llm = new ChatOllama({
            model: options.model || "llama3.2:3b",
            temperature: options.temperature !== undefined ? options.temperature : 0,
            maxRetries: options.maxRetries !== undefined ? options.maxRetries : 2,
        });
        // Rebuild the chain with new LLM
        service.chain = service.prompt.pipe(service.llm);
    }
    
    return service;
}

// Export a singleton instance
export const llmService = new LlmService();

// Also export the class if needed for testing or custom instances
export default LlmService;