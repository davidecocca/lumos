const { app, BrowserWindow, ipcMain, nativeImage, Menu } = require('electron');
const path = require('path');
const vectorStore = require('./database/vectorStore');
const vectorIndexer = require('./services/vectorIndexer');
const localEmbeddings = require('./services/localEmbeddings');
const imageService = require('./services/imageService');
const { checkCodex, runCodex } = require('./services/codexService');
const { randomUUID } = require('crypto');

// Import CRUD functions from the local DB layer
const {
    createFolder,
    getFolderContent,
    getFolder,
    updateFolder,
    deleteFolder,
    createNote,
    listFolders,
    getNote,
    getNotesByIds,
    listNotes,
    renameNote,
    updateNote,
    deleteNote,
    deleteNotesInFolder,
    moveNoteToFolder,
    setNoteFavorite,
    updateNoteLastViewed,
    getFavoriteNotes,
    getLastViewedNotes,
    searchNotes,
    clearVectorSync,
    createChatConversation,
    listChatConversations,
    getChatConversation,
    appendChatMessage,
    updateChatConversation,
    deleteChatConversation,
} = require('./database/crud.js');

const sendMenuAction = (window, action) => {
    window?.webContents.send('menu-action', action);
};

let menuState = {
    canCreateNote: false,
    hasOpenNote: false,
};

function createApplicationMenu() {
    const isDev = process.env.NODE_ENV === 'development';
    const template = [
        {
            label: 'File',
            submenu: [
                { label: 'New Note', accelerator: 'CommandOrControl+N', enabled: menuState.canCreateNote, click: (_, window) => sendMenuAction(window, 'new-note') },
                { label: 'New Folder', accelerator: 'CommandOrControl+Shift+N', click: (_, window) => sendMenuAction(window, 'new-folder') },
                { type: 'separator' },
                { label: 'Save Current Note', accelerator: 'CommandOrControl+S', enabled: menuState.hasOpenNote, click: (_, window) => sendMenuAction(window, 'save-note') },
                { type: 'separator' },
                { label: 'Close App', accelerator: 'CommandOrControl+Q', click: () => app.quit() },
            ],
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectAll' },
                ...(process.platform === 'darwin' ? [
                    { type: 'separator' },
                    { role: 'emoji' },
                ] : []),
                { type: 'separator' },
                { label: 'Find in Notes', accelerator: 'CommandOrControl+K', click: (_, window) => sendMenuAction(window, 'open-search') },
            ],
        },
        {
            label: 'View',
            submenu: [
                { label: 'Toggle Sidebar', accelerator: 'CommandOrControl+\\', click: (_, window) => sendMenuAction(window, 'toggle-sidebar') },
                { label: 'Toggle Note Chat', accelerator: 'CommandOrControl+L', enabled: menuState.hasOpenNote, click: (_, window) => sendMenuAction(window, 'toggle-note-chat') },
                { label: 'Open Chat', accelerator: 'CommandOrControl+Shift+L', click: (_, window) => sendMenuAction(window, 'open-chat') },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' },
                ...(isDev ? [
                    { type: 'separator' },
                    { role: 'reload' },
                    { role: 'forceReload' },
                    { label: 'Toggle Developer Tools', accelerator: 'CommandOrControl+Shift+I', click: (_, window) => window?.webContents.toggleDevTools() },
                ] : []),
            ],
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                ...(process.platform === 'darwin' ? [
                    { type: 'separator' },
                    { role: 'front' },
                ] : []),
            ],
        },
        {
            label: 'Help',
            submenu: [
                { label: 'About Lumos', click: (_, window) => sendMenuAction(window, 'about') },
            ],
        },
    ];

    if (process.platform === 'darwin') {
        template.unshift({
            label: app.name,
            submenu: [
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' },
            ],
        });
    }

    return Menu.buildFromTemplate(template);
}

// Give the renderer a short grace period to flush pending auto-saves
// before the app (or the window) goes away.
let flushSent = false;
function requestFlushAndContinue(continueFn) {
    if (flushSent) {
        continueFn();
        return;
    }
    const windows = BrowserWindow.getAllWindows();
    if (windows.length === 0) {
        continueFn();
        return;
    }
    flushSent = true;
    windows.forEach((w) => w.webContents.send('flush-saves'));
    setTimeout(continueFn, 900);
}

// Create the BrowserWindow
function createWindow() {
    const iconPath = path.join(__dirname, '..', 'rendered', 'assets', 'app_logo.png');
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        icon: iconPath,
        webPreferences: {
            // Use a preload script for secure IPC access from renderer
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,    // Best practice: disable nodeIntegration
            contextIsolation: true,     // Keep this true for security
            devTools: process.env.NODE_ENV === 'development', // Enable dev tools in development
        }
    });

    // Flush pending auto-saves before the window actually closes
    win.on('close', (event) => {
        if (flushSent) return;
        event.preventDefault();
        requestFlushAndContinue(() => win.close());
    });
    
    // DEV vs. PROD logic
    if (process.env.NODE_ENV === 'development') {
        // If running dev server (Vite on localhost:5173)
        win.loadURL('http://localhost:5173');
    } else {
        // Load the built index.html from the dist folder
        win.loadFile(path.join(__dirname, '../../dist', 'index.html'));
        // Adjust the path above to match where Vite outputs your build
    }
    
    // Setup the events to manage window fullscreen state
    win.on('enter-full-screen', () => {
        console.log('Main process: Entered full screen');
        // Send message to the renderer process
        win.webContents.send('fullscreen-changed', true);
    });
    
    win.on('leave-full-screen', () => {
        console.log('Main process: Left full screen');
        // Send message to the renderer process
        win.webContents.send('fullscreen-changed', false);
    });
    
    // Initial check in case the window starts fullscreen
    win.webContents.on('did-finish-load', () => {
        win.webContents.send('fullscreen-changed', win.isFullScreen());
    });
}

// Set up IPC handlers for folders and notes
function setupIPC() {
    // Window controls
    ipcMain.on('window-minimize', () => {
        BrowserWindow.getFocusedWindow()?.minimize();
    });
    ipcMain.on('window-maximize', () => {
        const win = BrowserWindow.getFocusedWindow();
        if (!win) return;
        if (win.isMaximized()) {
            win.unmaximize();
        } else {
            win.maximize();
        }
    });
    ipcMain.on('window-close', () => {
        BrowserWindow.getFocusedWindow()?.close();
    });
    ipcMain.on('open-devtools', () => {
        BrowserWindow.getFocusedWindow()?.webContents.openDevTools();
    });
    ipcMain.on('window-toggle-fullscreen', () => {
        const win = BrowserWindow.getFocusedWindow();
        if (!win) return;
        win.setFullScreen(!win.isFullScreen());
    });
    ipcMain.on('update-menu-state', (_, state) => {
        menuState = {
            canCreateNote: Boolean(state?.canCreateNote),
            hasOpenNote: Boolean(state?.hasOpenNote),
        };
        Menu.setApplicationMenu(createApplicationMenu());
    });
    ipcMain.handle('get-app-info', () => ({
        name: app.getName(),
        version: app.getVersion(),
        electronVersion: process.versions.electron,
        chromeVersion: process.versions.chrome,
        platform: process.platform,
    }));
    ipcMain.handle('get-codex-status', () => checkCodex());
    ipcMain.handle('run-codex', async (_, payload) => runCodex(payload || {}));
    ipcMain.handle('start-codex-stream', (event, payload) => {
        const requestId = randomUUID();
        setImmediate(() => {
            runCodex({
                ...(payload || {}),
                onDelta: (text) => event.sender.send('codex-stream', { requestId, type: 'delta', text }),
            })
                .then((text) => event.sender.send('codex-stream', { requestId, type: 'complete', text }))
                .catch((error) => event.sender.send('codex-stream', { requestId, type: 'error', error: error.message }));
        });
        return requestId;
    });

    // --- Folder IPC ---
    ipcMain.handle('create-folder', async (event, name) => {
        return new Promise((resolve, reject) => {
            createFolder(name, (err, folderId) => {
                if (err) reject(err);
                else resolve(folderId);
            });
        });
    });
    
    ipcMain.handle('get-folder-content', async (event, id) => {
        return new Promise((resolve, reject) => {
            getFolderContent(id, (err, folder) => {
                if (err) reject(err);
                else resolve(folder);
            });
        });
    });
    
    ipcMain.handle('get-folder', async (event, id) => {
        return new Promise((resolve, reject) => {
            getFolder(id, (err, folder) => {
                if (err) reject(err);
                else resolve(folder);
            });
        });
    });
    
    ipcMain.handle('update-folder', async (event, { id, newName }) => {
        return new Promise((resolve, reject) => {
            updateFolder(id, newName, (err, changes) => {
                if (err) reject(err);
                else resolve(changes);
            });
        });
    });
    
    ipcMain.handle('delete-folder', async (event, id) => {
        return new Promise((resolve, reject) => {
            deleteFolder(id, (err, changes) => {
                if (err) reject(err);
                else resolve(changes);
            });
        });
    });
    
    ipcMain.handle('list-folders', async (event) => {
        return new Promise((resolve, reject) => {
            listFolders((err, folders) => {
                if (err) reject(err);
                else resolve(folders);
            });
        });
    });
    
    // --- Note IPC ---
    ipcMain.handle('create-note', async (event, { folder_id, title, contentJson, contentText }) => {
        return new Promise((resolve, reject) => {
            createNote(folder_id, title, contentJson, contentText, (err, noteId) => {
                if (err) reject(err);
                else resolve(noteId);
            });
        });
    });
    
    ipcMain.handle('get-note', async (event, id) => {
        return new Promise((resolve, reject) => {
            getNote(id, (err, note) => {
                if (err) reject(err);
                else resolve(note);
            });
        });
    });
    
    ipcMain.handle('get-notes-by-ids', async (event, ids) => {
        return new Promise((resolve, reject) => {
            getNotesByIds(ids, (err, notes) => {
                if (err) reject(err);
                else resolve(notes);
            });
        });
    });
    
    ipcMain.handle('rename-note', async (event, { id, newTitle }) => {
        return new Promise((resolve, reject) => {
            renameNote(id, newTitle, (err, changes) => {
                if (err) reject(err);
                else resolve(changes);
            });
        });
    });
    
    ipcMain.handle('list-notes', async (event) => {
        return new Promise((resolve, reject) => {
            listNotes((err, notes) => {
                if (err) reject(err);
                else resolve(notes);
            });
        });
    });
    
    ipcMain.handle('update-note', async (event, { id, topic, contentJson, contentText }) => {
        return new Promise((resolve, reject) => {
            updateNote(id, topic, contentJson, contentText, (err, changes) => {
                if (err) reject(err);
                else resolve(changes);
            });
        });
    });

    ipcMain.handle('import-note-image', async (event, { noteId, fileName, mimeType, data }) => {
        return imageService.importNoteImage(noteId, { fileName, mimeType, data });
    });
    
    ipcMain.handle('delete-note', async (event, id) => {
        return new Promise((resolve, reject) => {
            deleteNote(id, (err, changes) => {
                if (err) reject(err);
                else resolve(changes);
            });
        });
    });
    
    ipcMain.handle('delete-notes-in-folder', async (event, folderId) => {
        return new Promise((resolve, reject) => {
            deleteNotesInFolder(folderId, (err, changes) => {
                if (err) reject(err);
                else resolve(changes);
            });
        });
    });
    
    ipcMain.handle('move-note-to-folder', async (event, { noteId, newFolderId }) => {
        return new Promise((resolve, reject) => {
            moveNoteToFolder(noteId, newFolderId, (err, changes) => {
                if (err) reject(err);
                else resolve(changes);
            });
        });
    });
    
    ipcMain.handle('set-note-favorite', async (event, { id, isFavorite }) => {
        return new Promise((resolve, reject) => {
            setNoteFavorite(id, isFavorite, (err, changes) => {
                if (err) reject(err);
                else resolve(changes);
            });
        });
    });
    
    ipcMain.handle('update-note-last-viewed', async (event, id) => {
        return new Promise((resolve, reject) => {
            updateNoteLastViewed(id, (err, changes) => {
                if (err) reject(err);
                else resolve(changes);
            });
        });
    });
    
    ipcMain.handle('get-favorite-notes', async (event) => {
        return new Promise((resolve, reject) => {
            getFavoriteNotes((err, notes) => {
                if (err) reject(err);
                else resolve(notes);
            });
        });
    });
    
    ipcMain.handle('get-last-viewed-notes', async (event) => {
        return new Promise((resolve, reject) => {
            getLastViewedNotes((err, notes) => {
                if (err) reject(err);
                else resolve(notes);
            });
        });
    });

    ipcMain.handle('search-notes', async (event, { query, limit = 10 } = {}) => {
        const safeLimit = Math.max(1, Number(limit) || 10);
        return new Promise((resolve, reject) => {
            searchNotes(query, safeLimit, (err, notes) => {
                if (err) reject(err);
                else resolve(notes);
            });
        });
    });
    
    ipcMain.handle('search-similar-notes', async (event, { query, limit, filter }) => {
        if (!vectorStore.ready) {
            throw new Error('Semantic search is unavailable: the local embedding model could not be loaded.');
        }
        return new Promise((resolve, reject) => {
            vectorStore.searchSimilarNotes(query, limit, filter)
            .then(results => resolve(results))
            .catch(err => reject(err));
        });
    });

    // --- RAG index management ---
    ipcMain.handle('rag-get-status', async () => vectorIndexer.getStatus());
    ipcMain.handle('rag-rebuild', async () => {
        if (!vectorStore.ready) {
            throw new Error('Vector store is unavailable.');
        }
        await vectorIndexer.rebuildAll();
        return vectorIndexer.getStatus();
    });

    // --- Chat IPC ---
    ipcMain.handle('create-chat-conversation', async (event, payload) => {
        return new Promise((resolve, reject) => {
            createChatConversation(payload, (err, conversation) => {
                if (err) reject(err);
                else resolve(conversation);
            });
        });
    });

    ipcMain.handle('list-chat-conversations', async (event, payload) => {
        return new Promise((resolve, reject) => {
            listChatConversations(payload, (err, conversations) => {
                if (err) reject(err);
                else resolve(conversations);
            });
        });
    });

    ipcMain.handle('get-chat-conversation', async (event, id) => {
        return new Promise((resolve, reject) => {
            getChatConversation(id, (err, conversation) => {
                if (err) reject(err);
                else resolve(conversation);
            });
        });
    });

    ipcMain.handle('append-chat-message', async (event, payload) => {
        return new Promise((resolve, reject) => {
            appendChatMessage(payload, (err, messageId) => {
                if (err) reject(err);
                else resolve(messageId);
            });
        });
    });

    ipcMain.handle('update-chat-conversation', async (event, payload) => {
        return new Promise((resolve, reject) => {
            updateChatConversation(payload, (err, changes) => {
                if (err) reject(err);
                else resolve(changes);
            });
        });
    });

    ipcMain.handle('delete-chat-conversation', async (event, id) => {
        return new Promise((resolve, reject) => {
            deleteChatConversation(id, (err, changes) => {
                if (err) reject(err);
                else resolve(changes);
            });
        });
    });
}

// Set the app name
app.setName('Lumos');

// Broadcast background indexing progress to all renderer windows
vectorIndexer.onStatus((status) => {
    for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send('rag-status', status);
    }
});

// App lifecycle
app.whenReady().then(() => {
    Menu.setApplicationMenu(createApplicationMenu());

    // Only on macOS
    if (process.platform === 'darwin') {
        // Set dock icon
        const iconPath = path.join(__dirname, '..', 'rendered', 'assets', 'app_logo.png');
        const icon = nativeImage.createFromPath(iconPath);
        app.dock.setIcon(icon);
    }

    // Initialize the vector store. RAG is a feature, not a launch requirement:
    // if it fails, Lumos still opens and search/chat simply report it.
    const lancePath = path.join(app.getPath('userData'), 'lancedb');
    vectorStore.initialize(lancePath)
    .then(async ({ rebuilt }) => {
        if (rebuilt) {
            await clearVectorSync();
        }

        createWindow();
        setupIPC();

        localEmbeddings.warmup();
        vectorIndexer.reconcile().catch((err) => {
            console.error('Vector index reconciliation failed:', err);
        });
    })
    .catch((err) => {
        console.error('Failed to initialize vector store, continuing without RAG:', err);
        createWindow();
        setupIPC();
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Flush pending auto-saves before quitting (menu quit / Cmd+Q)
app.on('before-quit', (event) => {
    if (flushSent) return;
    event.preventDefault();
    requestFlushAndContinue(() => app.quit());
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
