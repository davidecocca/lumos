const { app, BrowserWindow, ipcMain, nativeImage, Menu } = require('electron');
const path = require('path');
const vectorStore = require('./database/vectorStore');
const imageService = require('./services/imageService');

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
    createChatConversation,
    listChatConversations,
    getChatConversation,
    appendChatMessage,
    updateChatConversation,
    deleteChatConversation,
} = require('./database/crud.js');

// Create the BrowserWindow
function createWindow() {
    const iconPath = path.join(__dirname, '..', 'rendered', 'assets', 'app_logo.png');
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        icon: iconPath,
        // Hide titlebar only on macOS
        ...(process.platform === 'darwin' ? { titleBarStyle: 'hidden', trafficLightPosition: { x: 10, y: 16 } } : {}),
        webPreferences: {
            // Use a preload script for secure IPC access from renderer
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,    // Best practice: disable nodeIntegration
            contextIsolation: true,     // Keep this true for security
            devTools: process.env.NODE_ENV === 'development', // Enable dev tools in development
        }
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
        return new Promise((resolve, reject) => {
            vectorStore.searchSimilarNotes(query, limit, filter)
            .then(results => resolve(results))
            .catch(err => reject(err));
        });
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

// App lifecycle
app.whenReady().then(() => {
    // Only on macOS
    if (process.platform === 'darwin') {
        // Set dock icon
        const iconPath = path.join(__dirname, '..', 'rendered', 'assets', 'app_logo.png');
        const icon = nativeImage.createFromPath(iconPath);
        app.dock.setIcon(icon);
    }
    
    // Initialize the vector store
    vectorStore.initialize()
    .then(() => {
        createWindow();
        setupIPC();
    })
    .catch((err) => {
        console.error('Failed to initialize vector store:', err);
        app.quit();
    });
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
