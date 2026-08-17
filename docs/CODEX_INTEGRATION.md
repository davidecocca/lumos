# Codex Integration

Lumos integrates with the locally installed Codex CLI through its `app-server` mode. The integration is implemented in `src/main/services/codexService.js`.

## Process Boundary

The service runs in Electron's main process because it starts and manages a local system process:

```js
spawn('codex', ['app-server', '--stdio'])
```

It does not call an OpenAI HTTP API, handle API keys, or read Codex login credentials. Authentication remains owned by the installed CLI. The renderer accesses the service only through APIs exposed by `src/main/preload.js` and IPC handlers in `src/main/main.js`.

## App-Server Protocol

Codex app-server uses newline-delimited JSON-RPC over standard input and output.

Requests are sent in this form:

```json
{"jsonrpc":"2.0","id":1,"method":"method/name","params":{}}
```

`CodexAppServer` assigns each request an ID and keeps its Promise resolver in a pending-request map. It buffers stdout, parses complete JSON lines, and either resolves the matching request or forwards a notification to registered listeners. Each JSON-RPC request has a two-minute timeout.

The service first sends `initialize`, then sends the `initialized` notification required by the app-server protocol.

## Status and Capabilities

`checkCodex()` opens a temporary app-server connection and requests these endpoints concurrently:

- `model/list` for the available models, their supported reasoning efforts, and defaults.
- `account/rateLimits/read` for subscription quota information.

The result is used to populate the Codex provider UI. The app-server process is closed once the check finishes.

## Running a Prompt

`runCodex()` performs the following work:

1. Validates that the prompt is non-empty and no more than 100,000 characters.
2. Creates an empty, unique directory under the operating system temporary directory.
3. Starts and initializes an app-server process.
4. Starts an ephemeral Codex thread using this configuration:

```js
{
  cwd: workingDirectory,
  ephemeral: true,
  approvalPolicy: 'never',
  sandbox: 'read-only',
}
```

The empty temporary directory prevents Codex from accessing Lumos's real workspace. The read-only sandbox and `never` approval policy ensure it cannot edit files or trigger interactive tool approvals.

5. Starts a turn with the prompt, selected model, and optional reasoning effort.
6. Accumulates `item/agentMessage/delta` notifications and forwards each text delta to the caller.
7. Resolves when the matching `turn/completed` notification has a `completed` status.
8. Returns the accumulated assistant response.

## Streaming to the Renderer

The renderer calls `window.api.startCodexStream()`. The main process runs `runCodex()` and forwards its deltas as IPC events. The renderer subscribes with `window.api.onCodexStream()` and yields those deltas to the chat UI.

The resulting flow is:

```text
Renderer -> preload IPC API -> main IPC handler -> codexService
                                             <- streamed events <-
```

## Cleanup and Errors

`runCodex()` uses a `finally` block to remove its notification listener, terminate the app-server process, and delete the temporary workspace whether the request succeeds or fails. Process launch failures, app-server errors, invalid protocol output, and request timeouts are converted into user-facing errors.
