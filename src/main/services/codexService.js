const { spawn } = require('child_process');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const maximumPromptLength = 100000;         // 100k chars, ~25k tokens
const requestTimeoutMilliseconds = 120000;  // 120s

const formatCodexError = (error, stderr = '') => {
    if (error?.code === 'ENOENT') {
        return new Error('Codex CLI is not installed or is not available on PATH. Install Codex and sign in with `codex login`.');
    }

    const message = stderr.trim() || error?.message || 'Codex app-server failed unexpectedly.';
    return new Error(`Codex app-server error: ${message}`);
};

class CodexAppServer {
    constructor() {
        this.nextRequestId = 1;
        this.pending = new Map();
        this.notificationHandlers = new Set();
        this.stderr = '';
        this.failure = null;
        this.closed = false;
        this.stdoutBuffer = '';
        this.child = spawn('codex', ['app-server', '--stdio'], {
            shell: false,
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        this.child.stdout.setEncoding('utf8');
        this.child.stderr.setEncoding('utf8');
        this.child.stdout.on('data', (chunk) => this.handleStdout(chunk));
        this.child.stderr.on('data', (chunk) => {
            this.stderr += chunk;
        });
        this.child.on('error', (error) => this.closeWithError(formatCodexError(error, this.stderr)));
        this.child.on('close', (code, signal) => {
            if (!this.closed) {
                this.closeWithError(formatCodexError(new Error(`Codex app-server exited (${signal || code}).`), this.stderr));
            }
        });
    }

    handleStdout(chunk) {
        this.stdoutBuffer += chunk;
        let newlineIndex;
        while ((newlineIndex = this.stdoutBuffer.indexOf('\n')) !== -1) {
            const line = this.stdoutBuffer.slice(0, newlineIndex).trim();
            this.stdoutBuffer = this.stdoutBuffer.slice(newlineIndex + 1);
            if (!line) continue;

            let message;
            try {
                message = JSON.parse(line);
            } catch {
                this.closeWithError(new Error('Codex app-server returned invalid JSON-RPC output.'));
                return;
            }

            if (Object.prototype.hasOwnProperty.call(message, 'id')) {
                const pending = this.pending.get(message.id);
                if (!pending) continue;
                this.pending.delete(message.id);
                if (message.error) {
                    pending.reject(new Error(message.error.message || 'Codex app-server request failed.'));
                } else {
                    pending.resolve(message.result);
                }
            } else if (message.method) {
                for (const handler of this.notificationHandlers) handler(message);
            }
        }
    }

    request(method, params = {}) {
        if (this.closed) return Promise.reject(this.failure || new Error('Codex app-server is not running.'));

        const id = this.nextRequestId++;
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`Codex app-server timed out while calling ${method}. Check your Codex login and usage limits.`));
            }, requestTimeoutMilliseconds);
            this.pending.set(id, {
                resolve: (result) => {
                    clearTimeout(timeout);
                    resolve(result);
                },
                reject: (error) => {
                    clearTimeout(timeout);
                    reject(error);
                },
            });
            this.child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`, (error) => {
                if (!error) return;
                const pending = this.pending.get(id);
                if (pending) {
                    this.pending.delete(id);
                    pending.reject(formatCodexError(error, this.stderr));
                }
            });
        });
    }

    notify(method, params = {}) {
        if (this.closed) throw this.failure || new Error('Codex app-server is not running.');
        this.child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
    }

    onNotification(handler) {
        this.notificationHandlers.add(handler);
        return () => this.notificationHandlers.delete(handler);
    }

    closeWithError(error) {
        if (this.closed) return;
        this.closed = true;
        this.failure = error;
        for (const { reject } of this.pending.values()) reject(error);
        this.pending.clear();
    }

    async close() {
        this.closeWithError(new Error('Codex app-server connection closed.'));
        this.child.stdin.end();
        if (!this.child.killed) this.child.kill();
        await new Promise((resolve) => {
            if (this.child.exitCode !== null) return resolve();
            const timeout = setTimeout(resolve, 1000);
            this.child.once('close', () => {
                clearTimeout(timeout);
                resolve();
            });
        });
    }
}

const initialize = async (server) => {
    await server.request('initialize', {
        clientInfo: { name: 'lumos', version: '0.0.1' },
        capabilities: {},
    });
    server.notify('initialized');
};

const normalizeModels = (result) => (result?.data || []).map((model) => ({
    label: model.displayName || model.model || model.id,
    value: model.model || model.id,
    supportedReasoningEfforts: (model.supportedReasoningEfforts || []).map((effort) => (
        typeof effort === 'string' ? effort : effort.reasoningEffort
    )).filter(Boolean),
    defaultReasoningEffort: model.defaultReasoningEffort,
}));

const checkCodex = async () => {
    const server = new CodexAppServer();
    try {
        await initialize(server);
        const [modelList, rateLimits] = await Promise.all([
            server.request('model/list', {}),
            server.request('account/rateLimits/read', {}),
        ]);
        return { models: normalizeModels(modelList), rateLimits };
    } catch (error) {
        throw formatCodexError(error, server.stderr);
    } finally {
        await server.close();
    }
};

const runCodex = async ({ prompt, model, reasoningEffort, onDelta } = {}) => {
    if (typeof prompt !== 'string' || !prompt.trim()) {
        throw new Error('A prompt is required to run Codex.');
    }
    if (prompt.length > maximumPromptLength) {
        throw new Error('The Codex prompt is too long.');
    }

    const workingDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'lumos-codex-'));
    const server = new CodexAppServer();
    let removeNotificationHandler;

    try {
        await initialize(server);
        const thread = await server.request('thread/start', {
            cwd: workingDirectory,
            ephemeral: true,
            approvalPolicy: 'never',
            sandbox: 'read-only',
            model: model || null,
        });
        const threadId = thread.thread?.id || thread.id;
        if (!threadId) throw new Error('Codex app-server did not return a thread ID.');

        let response = '';
        let turnId;
        const completed = new Promise((resolve, reject) => {
            removeNotificationHandler = server.onNotification((message) => {
                const params = message.params || {};
                if (params.threadId !== threadId) return;
                if (message.method === 'item/agentMessage/delta') {
                    response += params.delta || '';
                    if (typeof onDelta === 'function' && params.delta) onDelta(params.delta);
                }
                if (message.method === 'item/completed' && !response && params.item?.type === 'agentMessage') {
                    response = params.item.text || '';
                    if (typeof onDelta === 'function' && response) onDelta(response);
                }
                if (message.method === 'error' && (!turnId || params.turnId === turnId)) {
                    reject(new Error(params.error?.message || 'Codex could not complete the response.'));
                }
                if (message.method === 'turn/completed' && (!turnId || params.turn?.id === turnId)) {
                    if (params.turn?.status !== 'completed') {
                        reject(new Error(`Codex turn ${params.turn?.status || 'failed'}.`));
                    } else {
                        resolve();
                    }
                }
            });
        });

        const turn = await server.request('turn/start', {
            threadId,
            input: [{ type: 'text', text: prompt }],
            model: model || null,
            effort: reasoningEffort || null,
            approvalPolicy: 'never',
        });
        turnId = turn.turn?.id || turn.id;
        await completed;
        return response;
    } catch (error) {
        throw formatCodexError(error, server.stderr);
    } finally {
        removeNotificationHandler?.();
        await server.close();
        await fs.rm(workingDirectory, { recursive: true, force: true });
    }
};

module.exports = { checkCodex, runCodex };
