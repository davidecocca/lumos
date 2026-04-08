const { app } = require('electron');
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { fileURLToPath, pathToFileURL } = require('url');

const IMAGE_ROOT_DIR = 'note-images';
const SUPPORTED_EXTENSIONS = new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.bmp',
    '.svg',
]);

const MIME_EXTENSION_MAP = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/bmp': '.bmp',
    'image/svg+xml': '.svg',
};

const EXTENSION_MIME_MAP = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
};

function getUserDataPath() {
    return app.getPath('userData');
}

function getNoteImageDir(noteId) {
    return path.join(getUserDataPath(), IMAGE_ROOT_DIR, String(noteId));
}

function toPortablePath(filePath) {
    return filePath.split(path.sep).join('/');
}

function getRelativeImagePath(noteId, fileName) {
    return toPortablePath(path.join(IMAGE_ROOT_DIR, String(noteId), fileName));
}

function isManagedImagePath(src) {
    return typeof src === 'string' && src.startsWith(`${IMAGE_ROOT_DIR}/`);
}

function getExtension(fileName = '', mimeType = '') {
    const fileExtension = path.extname(fileName).toLowerCase();
    
    if (SUPPORTED_EXTENSIONS.has(fileExtension)) {
        return fileExtension;
    }
    
    return MIME_EXTENSION_MAP[mimeType] || null;
}

function getMimeType(filePath = '') {
    return EXTENSION_MIME_MAP[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function toDataUrl(fileBuffer, filePath) {
    return `data:${getMimeType(filePath)};base64,${fileBuffer.toString('base64')}`;
}

function cloneContentNode(node) {
    if (!node || typeof node !== 'object') {
        return node;
    }
    
    if (Array.isArray(node)) {
        return node.map(cloneContentNode);
    }
    
    const clonedNode = { ...node };
    
    if (Array.isArray(node.content)) {
        clonedNode.content = node.content.map(cloneContentNode);
    }
    
    if (node.attrs && typeof node.attrs === 'object') {
        clonedNode.attrs = { ...node.attrs };
    }
    
    return clonedNode;
}

function mapNoteImages(node, transform) {
    if (!node || typeof node !== 'object') {
        return node;
    }
    
    if (Array.isArray(node)) {
        return node.map((entry) => mapNoteImages(entry, transform));
    }
    
    const nextNode = cloneContentNode(node);
    
    if (nextNode.type === 'noteImage' && nextNode.attrs) {
        nextNode.attrs = transform(nextNode.attrs);
    }
    
    if (Array.isArray(nextNode.content)) {
        nextNode.content = nextNode.content.map((entry) => mapNoteImages(entry, transform));
    }
    
    return nextNode;
}

function normalizeManagedPath(src) {
    if (!src || typeof src !== 'string') {
        return src;
    }
    
    if (isManagedImagePath(src)) {
        return src.replace(/\\/g, '/');
    }
    
    if (src.startsWith('file://')) {
        const absolutePath = fileURLToPath(src);
        const relativePath = path.relative(getUserDataPath(), absolutePath);
        
        if (!relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
            return toPortablePath(relativePath);
        }
    }
    
    return src;
}

function resolveManagedPath(src) {
    if (!isManagedImagePath(src)) {
        return src;
    }
    
    return pathToFileURL(path.join(getUserDataPath(), src)).toString();
}

function normalizeNoteContentForStorage(contentJson) {
    return mapNoteImages(contentJson, (attrs) => ({
        ...attrs,
        storageSrc: normalizeManagedPath(attrs.storageSrc || attrs.src),
        src: normalizeManagedPath(attrs.storageSrc || attrs.src) || attrs.src,
    }));
}

async function mapNoteImagesAsync(node, transform) {
    if (!node || typeof node !== 'object') {
        return node;
    }
    
    if (Array.isArray(node)) {
        return Promise.all(node.map((entry) => mapNoteImagesAsync(entry, transform)));
    }
    
    const nextNode = cloneContentNode(node);
    
    if (nextNode.type === 'noteImage' && nextNode.attrs) {
        nextNode.attrs = await transform(nextNode.attrs);
    }
    
    if (Array.isArray(nextNode.content)) {
        nextNode.content = await Promise.all(
            nextNode.content.map((entry) => mapNoteImagesAsync(entry, transform))
        );
    }
    
    return nextNode;
}

async function resolveNoteContentForDisplay(contentJson) {
    return mapNoteImagesAsync(contentJson, async (attrs) => {
        const storageSrc = normalizeManagedPath(attrs.storageSrc || attrs.src);
        
        if (!isManagedImagePath(storageSrc)) {
            return attrs;
        }
        
        try {
            const absolutePath = path.join(getUserDataPath(), storageSrc);
            const fileBuffer = await fs.readFile(absolutePath);
            
            return {
                ...attrs,
                storageSrc,
                src: toDataUrl(fileBuffer, absolutePath),
            };
        } catch (error) {
            return {
                ...attrs,
                storageSrc,
                src: resolveManagedPath(storageSrc),
            };
        }
    });
}

function collectManagedImagePaths(contentJson, refs = new Set()) {
    if (!contentJson || typeof contentJson !== 'object') {
        return refs;
    }
    
    if (Array.isArray(contentJson)) {
        contentJson.forEach((entry) => collectManagedImagePaths(entry, refs));
        return refs;
    }
    
    if (contentJson.type === 'noteImage' && contentJson.attrs?.src) {
        const normalizedPath = normalizeManagedPath(contentJson.attrs.storageSrc || contentJson.attrs.src);
        
        if (isManagedImagePath(normalizedPath)) {
            refs.add(normalizedPath);
        }
    }
    
    if (Array.isArray(contentJson.content)) {
        contentJson.content.forEach((entry) => collectManagedImagePaths(entry, refs));
    }
    
    return refs;
}

async function ensureNoteImageDir(noteId) {
    await fs.mkdir(getNoteImageDir(noteId), { recursive: true });
}

async function importNoteImage(noteId, { fileName, mimeType, data }) {
    const extension = getExtension(fileName, mimeType);
    
    if (!extension) {
        throw new Error('Unsupported image type. Supported formats: PNG, JPG, GIF, WEBP, BMP, SVG.');
    }
    
    const fileBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const storedFileName = `${crypto.randomUUID()}${extension}`;
    const relativePath = getRelativeImagePath(noteId, storedFileName);
    const absolutePath = path.join(getUserDataPath(), relativePath);
    
    await ensureNoteImageDir(noteId);
    await fs.writeFile(absolutePath, fileBuffer);
    
    return {
        src: toDataUrl(fileBuffer, absolutePath),
        storedSrc: relativePath,
    };
}

async function pruneNoteImages(noteId, referencedPaths) {
    const noteImageDir = getNoteImageDir(noteId);
    
    try {
        const fileNames = await fs.readdir(noteImageDir);
        
        await Promise.all(
            fileNames.map(async (fileName) => {
                const relativePath = getRelativeImagePath(noteId, fileName);
                
                if (!referencedPaths.has(relativePath)) {
                    await fs.rm(path.join(noteImageDir, fileName), { force: true });
                }
            })
        );
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }
}

async function deleteNoteImages(noteId) {
    await fs.rm(getNoteImageDir(noteId), { recursive: true, force: true });
}

module.exports = {
    collectManagedImagePaths,
    deleteNoteImages,
    importNoteImage,
    normalizeNoteContentForStorage,
    pruneNoteImages,
    resolveNoteContentForDisplay,
};
