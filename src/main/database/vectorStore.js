const { LanceDB } = require("@langchain/community/vectorstores/lancedb");
const { connect } = require('@lancedb/lancedb')
const { Document } = require("langchain/document");
const { OllamaEmbeddings } = require("@langchain/ollama");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const path = require("path");
const os = require("os");

const ollamaBaseUrl = "http://127.0.0.1:11434";
const defaultEmbeddingModel = "embeddinggemma:300m";
const tableName = "notes_embeddings";
const chunkSize = 512;
const chunkOverlap = 64;
const maxDistance = 0.70;
const maxResults = 5;
const oversamplingFactor = 3;
const dbPath = path.join(os.homedir(), "lancedb");

/**
* Service for managing a vector store using LanceDB
* and Ollama embeddings.
*/
class VectorStore {
    /**
    * @constructor
    * Initializes the LanceDB connection and Ollama embeddings.
    * @returns {void}
    * @throws {Error} If there is an error initializing the vector store.
    */
    constructor() {
        this.embeddings = new OllamaEmbeddings({
            model: defaultEmbeddingModel,
            baseUrl: ollamaBaseUrl
        });
        this.vectorStore = null;
        this.db = null;
        this.table = null;
    }
    
    /**
    * Initialize the vector store by creating a collection
    * and setting up the embedding function.
    * @returns {Promise<void>}
    * @throws {Error} If there is an error initializing the vector store.
    */
    async initialize() {
        try {
            // Connect to LanceDB
            this.db = await connect(dbPath);
            
            // Check if table exists
            const tableNames = await this.db.tableNames();
            
            if (tableNames.includes(tableName)) {
                // Open existing table
                this.table = await this.db.openTable(tableName);
                
                // Create LanceDB vector store with existing table
                this.vectorStore = new LanceDB(this.embeddings, { table: this.table });
            } else {
                // Create new vector store with LanceDB
                this.vectorStore = await LanceDB.fromTexts(
                    [""],   // Initialize with empty text
                    { source: "initialization" },
                    this.embeddings,
                    {
                        uri: dbPath,
                        tableName: tableName
                    }
                );
                this.table = this.vectorStore.table;
            }
        } catch (err) {
            console.error('Error initializing vector store:', err);
            throw err;
        }
    }
    
    /**
    * Add a note to the vector store.
    * @param {number} noteId - The ID of the note.
    * @param {string} content - The content of the note.
    * @returns {Promise<void>}
    * @throws {Error} If there is an error adding the note.
    */
    async addNote(noteId, content) {
        try {
            // Create text splitter
            const textSplitter = new RecursiveCharacterTextSplitter({
                chunkSize: chunkSize,
                chunkOverlap: chunkOverlap
            });
            
            // Split text into chunks
            const chunks = await textSplitter.splitText(content);
            
            const docs = chunks.map(chunk => new Document({
                pageContent: chunk,
                metadata: { 
                    source: noteId.toString()
                }
            }));
            
            // Add documents to vector store
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
    * @throws {Error} If there is an error deleting the note chunks.
    */
    async deleteNote(noteId) {
        try {
            if (!this.table) {
                throw new Error("Vector store not initialized");
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
    * @throws {Error} If there is an error searching the vector store.
    */    
    async searchSimilarNotes(query, limit = maxResults, filter = null) {
        try {
            if (!this.table) {
                throw new Error("Vector store not initialized");
            }
            
            // 1. Build query embedding
            const queryEmbedding = await this.embeddings.embedQuery(query);
            
            // 2. Search for similar notes using LanceDB's query builder
            let q = this.table.search(queryEmbedding).distanceType("cosine");
            
            // 3. If provided, apply filter
            if (filter) {
                // For now, only support filtering by source (note ID).
                if (filter.source != null) {
                    const sourceValue = String(filter.source).replace(/'/g, "''");
                    q = q.where(`source = '${sourceValue}'`);
                }
            }
            
            // 4. Limit results and execute query
            const rows = await q.limit(limit * oversamplingFactor).toArray();
            
            // 5. Map results to desired format
            const docs = rows.map((r) => {
                const pageContent = r.text ?? r.pageContent ?? "";
                const metadata = {
                    ...(r.metadata ?? {}),
                    ...(r.source !== undefined ? { source: String(r.source) } : {}),
                    ...(r._distance !== undefined ? { _distance: r._distance } : {}),
                };
                
                return { pageContent, metadata };
            })
            .filter((d) => d.pageContent.trim().length > 0)
            .filter((d) => {
                const dist = d.metadata?._distance;
                return typeof dist === "number" && dist <= maxDistance;
            })
            .slice(0, limit);
            
            return docs;
            
        } catch (err) {
            console.error("Error searching vector store:", err);
            throw err;
        }
    }
}

module.exports = new VectorStore();