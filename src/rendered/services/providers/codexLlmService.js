import { HumanMessage } from '@langchain/core/messages';

export class CodexLlmService {
    constructor(systemPrompt, model, reasoningEffort) {
        this.systemPrompt = systemPrompt;
        this.model = model;
        this.reasoningEffort = reasoningEffort;
    }

    buildPrompt(message, history) {
        const historyText = history
            .map((entry) => {
                const role =
                    entry instanceof HumanMessage ? 'User' : 'Assistant';
                return `${role}: ${entry.content}`;
            })
            .join('\n\n');

        return [
            this.systemPrompt,
            historyText && `Conversation history:\n${historyText}`,
            `User: ${message}`,
        ]
            .filter(Boolean)
            .join('\n\n');
    }

    async generate(message, history = []) {
        return window.api.runCodex({
            prompt: this.buildPrompt(message, history),
            model: this.model,
            reasoningEffort: this.reasoningEffort,
        });
    }

    async *stream(message, history = []) {
        const chunks = [];
        let complete = false;
        let error = null;
        let resolveNext;
        let requestId;
        const wake = () => resolveNext?.();
        const unsubscribe = window.api.onCodexStream((event) => {
            if (event.requestId !== requestId) return;
            if (event.type === 'delta') chunks.push(event.text);
            if (event.type === 'error') error = new Error(event.error);
            if (event.type === 'complete' || event.type === 'error')
                complete = true;
            wake();
        });

        try {
            requestId = await window.api.startCodexStream({
                prompt: this.buildPrompt(message, history),
                model: this.model,
                reasoningEffort: this.reasoningEffort,
            });

            while (!complete || chunks.length) {
                if (chunks.length) {
                    yield chunks.shift();
                } else {
                    await new Promise((resolve) => {
                        resolveNext = resolve;
                    });
                    resolveNext = null;
                }
            }
            if (error) throw error;
        } finally {
            unsubscribe();
        }
    }
}
