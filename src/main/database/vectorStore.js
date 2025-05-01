const { LanceDB } = require("@langchain/community/vectorstores/lancedb");
const { connect } = require('@lancedb/lancedb')
const { Document } = require("langchain/document");
const { OllamaEmbeddings } = require("@langchain/ollama");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const path = require("path");
const os = require("os");

const ollamaBaseUrl = "http://127.0.0.1:11434";
const defaultEmbeddingModel = "snowflake-arctic-embed2";
const tableName = "notes_embeddings";
const chunkSize = 2000;
const chunkOverlap = 200;
const similarityThreshold = 0.8;    // Not yet used
const maxResults = 5;
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
    * @param {number} limit - The maximum number of results to return.
    * @returns {Promise<object[]>} - The search results.
    * @throws {Error} If there is an error searching the vector store.
    */
    // TODO: Add support for similarity threshold
    // TODO: Sort results by similarity score
    async searchSimilarNotes(query, limit = maxResults) {
        try {
            const results = await this.vectorStore.similaritySearch(
                query, 
                limit,
            );
            
            return results
        } catch (err) {
            console.error('Error searching vector store:', err);
            throw err;
        }
    }
}

module.exports = new VectorStore();