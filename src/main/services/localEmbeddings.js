const path = require("path");
const fs = require("fs");

// Local embeddings via Transformers.js + ONNX Runtime.
//
// Runs the Q4-quantized EmbeddingGemma model bundled under resources/models/
// (see scripts/fetch-embedding-model.mjs). Everything happens offline, in the
// main process. This module intentionally has no Electron dependency so it can
// be smoke-tested with plain Node.

const modelName = "embeddinggemma-300m-onnx";
const embeddingDim = 768;
const inferenceBatchSize = 16;  // Number of texts to embed in one forward pass

let enginePromise = null;

/**
 * Resolve the directory containing the bundled ONNX model, working both in
 * development (resources/ next to src/) and when packaged (extraResources
 * copied into process.resourcesPath/models).
 */
function resolveModelDir() {
    const candidates = [];

    // Packaged app: Electron copies the model to process.resourcesPath/models/...
    if (process.resourcesPath) {
        candidates.push(path.join(process.resourcesPath, "models", modelName));
    }

    // Development: model stays in resources/models/
    candidates.push(path.join(__dirname, "..", "..", "..", "resources", "models", modelName));

    // Check for config.json in each candidate directory to verify the model is present.
    for (const candidate of candidates) {
        if (fs.existsSync(path.join(candidate, "config.json"))) {
            return candidate;
        }
    }

    throw new Error(
        `Bundled embedding model not found (looked in: ${candidates.join(", ")}). ` +
        "Run `npm run fetch:model` first."
    );
}

// One shared async model instance: load the model and tokenizer once, then reuse them for all embedding requests.
function getEngine() {
    if (!enginePromise) {
        enginePromise = (async () => {
            const { AutoTokenizer, AutoModel, env } = require("@huggingface/transformers");

            // Offline enforcment; Lumos ships its own model so never touch the network for embeddings.
            env.allowLocalModels = true;
            env.allowRemoteModels = false;

            const modelDir = resolveModelDir();
            const tokenizer = await AutoTokenizer.from_pretrained(modelDir);
            const model = await AutoModel.from_pretrained(modelDir, {
                dtype: "q4",    // Use Q4 quantized model for smaller memory footprint and faster inference
            });

            return { tokenizer, model };
        })().catch((err) => {
            enginePromise = null;
            throw err;
        });
    }
    return enginePromise;
}

/**
 * Kick off model loading without waiting for it (used to warm up on startup).
 */
function warmup() {
    getEngine().then(() => {
        console.log("Local embedding model loaded.");
    }).catch((err) => {
        console.error("Failed to load local embedding model:", err.message);
    });
}

/**
 * Embed a batch of texts.
 * @param {string[]} texts
 * @returns {Promise<number[][]>} one vector per input text
 */
async function embedTexts(texts) {
    // Normalize every input to a string and handles an empty input list.
    const cleanTexts = (texts || []).map((text) => String(text ?? ""));
    if (cleanTexts.length === 0) return [];

    const { tokenizer, model } = await getEngine();
    const vectors = [];

    // Process texts in groups of 16
    for (let offset = 0; offset < cleanTexts.length; offset += inferenceBatchSize) {
        // Get current batch of texts
        const batch = cleanTexts.slice(offset, offset + inferenceBatchSize);
        // Tokenize and embed the batch
        const inputs = await tokenizer(batch, { padding: true });
        const { sentence_embedding } = await model(inputs);

        // Result = tensor shaped [batchSize, 768]
        const [batchSize, dim] = sentence_embedding.dims;
        if (dim !== embeddingDim) {
            throw new Error(`Unexpected embedding dimension ${dim}, expected ${embeddingDim}`);
        }

        // Convert each typed-array slice into plain JavaScript arrays, which LanceDB/LangChain can serialize and store.
        const data = sentence_embedding.data;
        for (let i = 0; i < batchSize; i++) {
            vectors.push(Array.from(data.subarray(i * dim, (i + 1) * dim)));
        }
    }

    return vectors;
}

// Public API
/**
 * Embed a single query string.
 * @param {string} query
 * @returns {Promise<number[]>} embedding vector
 */
async function embedQuery(query) {
    const [vector] = await embedTexts([query]);
    return vector;
}

/**
 * Embed a list of documents.
 * @param {string[]} documents
 * @returns {Promise<number[][]>} list of embedding vectors
 */
async function embedDocuments(documents) {
    return embedTexts(documents);
}

module.exports = {
    embedQuery,
    embedDocuments,
    warmup,
    resolveModelDir,
    embeddingDim,
};
