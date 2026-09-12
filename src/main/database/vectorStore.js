const { LanceDB } = require('@langchain/community/vectorstores/lancedb');
const { connect } = require('@lancedb/lancedb');
const { Document } = require('langchain/document');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
// Local embeddings provider
const localEmbeddings = require('../services/localEmbeddings');
const fs = require('fs');
const path = require('path');

// Embeddings come from the bundled EmbeddingGemma ONNX model (see
// services/localEmbeddings.js). The prompt prefixes below follow the official
// EmbeddingGemma retrieval recipe and must stay in sync with indexManifest,
// because changing them changes the whole vector space.
const queryPrefix = 'task: search result | query: ';
const documentPrefixTitle = 'title: ';
const documentPrefixText = ' | text: ';
const documentPrefixRegex = /^title: [\s\S]*? \| text: /;

const tableName = 'notes_embeddings';
const chunkSize = 512;
const chunkOverlap = 64;
const maxDistance = 0.7;
const maxResults = 5;
const oversamplingFactor = 3;

const indexManifest = {
    modelId: 'onnx-community/embeddinggemma-300m-ONNX',
    // Must match REVISION in scripts/fetch-embedding-model.mjs.
    revision: '5090578d9565bb06545b4552f76e6bc2c93e4a66',
    dimension: localEmbeddings.embeddingDim,
    quantization: 'q4',
    chunkSize,
    chunkOverlap,
};

/**
 * Service for managing a local vector store using LanceDB
 * and the bundled offline embedding model.
 */
class VectorStore {
    constructor() {
        this.vectorStore = null;
        this.db = null;
        this.table = null;
        this.dbPath = null;
        this.ready = false;
        this.initializing = false;
        this.lastError = null;
    }

    /**
     * Initialize the vector store.
     * @param {string} dbPath - Directory holding the LanceDB database.
     * @returns {Promise<{rebuilt: boolean}>} rebuilt=true when the existing
     *          index was discarded (model/chunking change) and notes need reindexing.
     */
    async initialize(dbPath) {
        this.dbPath = dbPath;
        this.ready = false;
        this.initializing = true;
        this.lastError = null;

        try {
            fs.mkdirSync(dbPath, { recursive: true });
            this.db = await connect(dbPath);

            const tableNames = await this.db.tableNames();
            const manifestPath = path.join(dbPath, 'index_manifest.json');

            if (!tableNames.includes(tableName)) {
                await this.createEmptyTable();
                await this.writeManifest(manifestPath);
                this.ready = true;
                return { rebuilt: false };
            }

            const storedManifest = this.readManifest(manifestPath);
            if (!this.manifestMatches(storedManifest)) {
                console.log(
                    'Embedding index outdated (model or chunking changed), rebuilding.',
                );
                await this.db.dropTable(tableName);
                await this.createEmptyTable();
                await this.writeManifest(manifestPath);
                this.ready = true;
                return { rebuilt: true };
            }

            this.table = await this.db.openTable(tableName);
            this.vectorStore = new LanceDB(this.buildEmbeddings(), {
                table: this.table,
            });
            this.ready = true;
            return { rebuilt: false };
        } catch (err) {
            this.lastError = err;
            throw err;
        } finally {
            this.initializing = false;
        }
    }

    buildEmbeddings() {
        // Thin adapter so LangChain's LanceDB wrapper uses the local model,
        // while queries additionally carry the retrieval prompt prefix.
        return {
            embedQuery: (query) =>
                localEmbeddings.embedQuery(queryPrefix + query),
            embedDocuments: (texts) => localEmbeddings.embedDocuments(texts),
        };
    }

    readManifest(manifestPath) {
        try {
            return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        } catch {
            return null;
        }
    }

    manifestMatches(stored) {
        return (
            Boolean(stored) &&
            stored.modelId === indexManifest.modelId &&
            stored.revision === indexManifest.revision &&
            stored.dimension === indexManifest.dimension &&
            stored.quantization === indexManifest.quantization &&
            stored.chunkSize === indexManifest.chunkSize &&
            stored.chunkOverlap === indexManifest.chunkOverlap
        );
    }

    async writeManifest(manifestPath) {
        fs.writeFileSync(
            manifestPath,
            `${JSON.stringify(indexManifest, null, 4)}\n`,
        );
    }

    async createEmptyTable() {
        this.vectorStore = await LanceDB.fromTexts(
            [''], // Initialize with empty text
            { source: 'initialization' },
            this.buildEmbeddings(),
            {
                uri: this.dbPath,
                tableName: tableName,
            },
        );
        this.table = this.vectorStore.table;
    }

    /**
     * Add a note to the vector store.
     * @param {number} noteId - The ID of the note.
     * @param {string} content - The content of the note.
     * @param {string|null} title - Optional note title, embedded with each chunk.
     * @returns {Promise<void>}
     */
    async addNote(noteId, content, title = null) {
        try {
            if (!this.vectorStore) {
                throw new Error('Vector store not initialized');
            }

            const docPrefix = `${documentPrefixTitle}${title || 'none'}${documentPrefixText}`;

            const textSplitter = new RecursiveCharacterTextSplitter({
                chunkSize: chunkSize,
                chunkOverlap: chunkOverlap,
            });

            const chunks = await textSplitter.splitText(content);

            const docs = chunks.map(
                (chunk) =>
                    new Document({
                        pageContent: `${docPrefix}${chunk}`,
                        metadata: {
                            source: noteId.toString(),
                        },
                    }),
            );

            await this.vectorStore.addDocuments(docs);
        } catch (err) {
            console.error('Error adding note to vector store:', err);
            throw err;
        }
    }

    /**
     * Delete all chunks associated with a specific note.
     * @param {number} noteId - The ID of the note to delete chunks for.
     * @returns {Promise<void>}
     */
    async deleteNote(noteId) {
        try {
            if (!this.table) {
                throw new Error('Vector store not initialized');
            }

            await this.table.delete(`source = '${noteId}'`);
        } catch (err) {
            console.error('Error deleting note chunks from vector store:', err);
            throw err;
        }
    }

    /**
     * Search for similar notes based on a query.
     * @param {string} query - The query to search for.
     * @param {number} limit - The maximum number of results to return. Defaults to maxResults.
     * @param {object} filter - Optional filter to further refine search results. For now only supports filtering by source (e.g. { source: "0" }).
     * @returns {Promise<object[]>} - The search results.
     */
    async searchSimilarNotes(query, limit = maxResults, filter = null) {
        try {
            if (!this.table) {
                throw new Error('Vector store not initialized');
            }

            // 1. Build query embedding (with the retrieval prompt prefix)
            const queryEmbedding = await localEmbeddings.embedQuery(
                queryPrefix + query,
            );

            // 2. Search for similar notes using LanceDB's query builder
            let q = this.table.search(queryEmbedding).distanceType('cosine');

            // 3. If provided, apply filter
            if (filter) {
                // For now, only support filtering by source (note ID).
                if (filter.source != null) {
                    const sourceValue = String(filter.source).replace(
                        /'/g,
                        "''",
                    );
                    q = q.where(`source = '${sourceValue}'`);
                }
            }

            // 4. Limit results and execute query
            const rows = await q.limit(limit * oversamplingFactor).toArray();

            // 5. Map results to desired format
            const docs = rows
                .map((r) => {
                    const rawContent = r.text ?? r.pageContent ?? '';
                    // Chunks are stored with the EmbeddingGemma document prefix; strip
                    // it so callers only ever see the original note text.
                    const pageContent = rawContent.replace(
                        documentPrefixRegex,
                        '',
                    );
                    const metadata = {
                        ...(r.metadata ?? {}),
                        ...(r.source !== undefined
                            ? { source: String(r.source) }
                            : {}),
                        ...(r._distance !== undefined
                            ? { _distance: r._distance }
                            : {}),
                    };

                    return { pageContent, metadata };
                })
                .filter((d) => d.pageContent.trim().length > 0)
                .filter((d) => {
                    const dist = d.metadata?._distance;
                    return typeof dist === 'number' && dist <= maxDistance;
                })
                .slice(0, limit);

            return docs;
        } catch (err) {
            console.error('Error searching vector store:', err);
            throw err;
        }
    }
}

module.exports = new VectorStore();
