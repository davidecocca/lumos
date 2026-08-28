# Lumos AGENTS.md

## Project context

Lumos is a local-first desktop note-taking app with rich-text editing, folder organization, and AI-assisted writing/chat features.

Key constraints:
- Notes stay local by default.
- Local AI is preferred: embeddings run fully offline via a bundled ONNX model; chat LLMs via Ollama.
- Hosted AI providers are optional and must use user-provided API keys.
- The UI should stay clean, fast, minimal, and distraction-free.

## Tech stack

- Electron: desktop shell
- Vue 3: frontend
- Vuetify 4: UI components and layout system
  - Reference: https://vuetifyjs.com/en/components/all
- Tiptap 3.x: rich-text editor
  - Reference: https://tiptap.dev/docs
- SQLite: local note storage
- LanceDB: local vector storage
- LangChain: AI/LLM orchestration
- Transformers.js + ONNX Runtime: offline embeddings in the main process
  - Bundled model: EmbeddingGemma 300M (Q4 ONNX), pinned by `scripts/embedding-model.lock.json`
  - Fetched with `npm run fetch:model` into gitignored `resources/models/`
- Ollama: local chat LLMs (optional)
- Optional hosted providers: OpenAI or similar, using user-provided API keys

## Architecture notes

- Note saves never wait on embeddings: a background queue (`src/main/services/vectorIndexer.js`) indexes notes after save/rename and reconciles on startup using the `vector_sync` SQLite table.
- The vector index manifest (`index_manifest.json`) triggers an automatic full rebuild when the embedding model, revision, or chunking changes.
- RAG is non-fatal at startup: if the embedding model cannot load, Lumos still opens and reports it.

## Development rules

1. Keep code simple and changes minimal.
   - Prefer straightforward, readable solutions.
   - Avoid unrelated refactors and broad formatting changes.
   - Use abstractions only when they clearly reduce complexity.

2. Plan before large changes.
   - For new features, architectural changes, or refactors, propose the approach before editing code.
   - Ask before proceeding if the decision affects architecture, storage, AI behavior, privacy, UI direction, or dependencies.

3. Use Vuetify first for UI.
   - Prefer official Vuetify 4 components, directives, utilities, and layout patterns.
   - Avoid custom CSS unless Vuetify cannot solve the issue cleanly or the CSS solution is clearly simpler.

4. Preserve local-first privacy.
   - Do not introduce cloud sync, telemetry, analytics, or remote AI calls unless explicitly requested.
   - Never hardcode API keys or provider credentials.

5. Avoid unnecessary full builds.
   - Do not run expensive build/test commands unless explicitly requested.
   - Prefer focused checks when possible.

6. Assume files may change between interactions.
   - The user reviews and edits code manually.
   - Inspect the current file before applying follow-up changes.
