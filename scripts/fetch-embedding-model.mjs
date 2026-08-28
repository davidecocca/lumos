#!/usr/bin/env node
// Downloads the pinned EmbeddingGemma Q4 ONNX model used for local RAG embeddings.
//
// Usage:
//   node scripts/fetch-embedding-model.mjs                # verify against lock, download what's missing
//   node scripts/fetch-embedding-model.mjs --update-lock  # re-download everything and rewrite the lockfile
//
// The model files live under resources/models/ (gitignored); only this lockfile is committed.

import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const REPOSITORY = 'onnx-community/embeddinggemma-300m-ONNX';
const REVISION = '5090578d9565bb06545b4552f76e6bc2c93e4a66';

const MODEL_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'resources', 'models', 'embeddinggemma-300m-onnx');
const LOCK_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'embedding-model.lock.json');

// Expected sizes come from the pinned revision; they guard against truncated downloads.
const MODEL_FILES = [
    { file: 'config.json', size: 1765 },
    { file: 'added_tokens.json', size: 35 },
    { file: 'special_tokens_map.json', size: 662 },
    { file: 'tokenizer.json', size: 20323312 },
    { file: 'tokenizer_config.json', size: 1156830 },
    { file: 'onnx/model_q4.onnx', size: 519322 },
    { file: 'onnx/model_q4.onnx_data', size: 196725760 },
];

const updateLock = process.argv.includes('--update-lock');

function sha256(filePath) {
    return new Promise((resolve, reject) => {
        const hash = createHash('sha256');
        fs.open(filePath, 'r').then((handle) => handle.createReadStream()).then((stream) => {
            stream.on('data', (chunk) => hash.update(chunk));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        }).catch(reject);
    });
}

function formatBytes(bytes) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function downloadModelFile(relativePath, expectedSize, destination) {
    const url = `https://huggingface.co/${REPOSITORY}/resolve/${REVISION}/${relativePath}`;
    const tempFile = `${destination}.download`;

    await fs.mkdir(path.dirname(destination), { recursive: true });

    let attempts = 0;
    while (true) {
        attempts += 1;
        try {
            const response = await fetch(url, { redirect: 'follow' });
            if (!response.ok || !response.body) {
                throw new Error(`HTTP ${response.status} for ${url}`);
            }

            const hash = createHash('sha256');
            let received = 0;
            let lastLogged = 0;
            const countAndHash = async function* (source) {
                for await (const chunk of source) {
                    received += chunk.length;
                    hash.update(chunk);
                    if (received - lastLogged > 25 * 1024 * 1024) {
                        lastLogged = received;
                        process.stdout.write(`\r    ${formatBytes(received)}`);
                    }
                    yield chunk;
                }
            };

            await pipeline(Readable.fromWeb(response.body), countAndHash, createWriteStream(tempFile));
            process.stdout.write(`\r    ${formatBytes(received)}\n`);

            if (expectedSize && received !== expectedSize) {
                throw new Error(`size mismatch for ${relativePath}: got ${received}, expected ${expectedSize}`);
            }

            await fs.rename(tempFile, destination);
            return hash.digest('hex');
        } catch (error) {
            await fs.rm(tempFile, { force: true });
            if (attempts >= 3) throw error;
            console.warn(`    attempt ${attempts} failed (${error.message}), retrying...`);
            await new Promise((resolve) => setTimeout(resolve, attempts * 2000));
        }
    }
}

async function main() {
    let lock = { repository: REPOSITORY, revision: REVISION, files: {} };

    if (updateLock) {
        console.log(`Updating model lock from ${REPOSITORY}@${REVISION}`);
    } else {
        try {
            lock = JSON.parse(await fs.readFile(LOCK_FILE, 'utf8'));
            if (lock.revision !== REVISION) {
                console.error(`Lockfile revision ${lock.revision} does not match script revision ${REVISION}.`);
                console.error('Run with --update-lock after bumping REVISION intentionally.');
                process.exit(1);
            }
        } catch {
            console.error('Lockfile missing or unreadable. Run: node scripts/fetch-embedding-model.mjs --update-lock');
            process.exit(1);
        }
    }

    let changed = false;
    for (const entry of MODEL_FILES) {
        const destination = path.join(MODEL_DIR, entry.file);
        const expected = lock.files[entry.file];

        if (!updateLock && expected) {
            try {
                const stat = await fs.stat(destination);
                if (stat.size === entry.size && await sha256(destination) === expected.sha256) {
                    console.log(`  ok      ${entry.file}`);
                    continue;
                }
                console.log(`  invalid ${entry.file} (hash/size mismatch), re-downloading`);
            } catch {
                console.log(`  missing ${entry.file}, downloading`);
            }
        } else {
            console.log(`  fetch   ${entry.file}`);
        }

        const digest = await downloadModelFile(entry.file, entry.size, destination);
        lock.files[entry.file] = { sha256: digest, size: entry.size };
        changed = true;
        console.log(`  done    ${entry.file} (sha256 ${digest.slice(0, 12)}...)`);
    }

    if (updateLock || changed) {
        lock.updatedAt = new Date().toISOString();
        await fs.writeFile(LOCK_FILE, `${JSON.stringify(lock, null, 4)}\n`);
        console.log(`Lock written: ${LOCK_FILE}`);
    }

    console.log('Embedding model ready.');
}

main().catch((error) => {
    console.error('Failed to fetch embedding model:', error.message);
    process.exit(1);
});
