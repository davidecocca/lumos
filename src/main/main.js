const { app, BrowserWindow, ipcMain, nativeImage, Menu } = require('electron');
const path = require('path');

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
    renameNote,
    updateNote,
    deleteNote,
    deleteNotesInFolder,
    moveNoteToFolder,
    setNoteFavorite,
    updateNoteLastViewed,
    getFavoriteNotes,
    getLastViewedNotes,
} = require('./database/crud.js');

// Create the BrowserWindow
function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        // Remove the default titlebar
        titleBarStyle: 'hidden',
        trafficLightPosition: { x: 10, y: 16 },
        // Expose window controlls in Windows/Linux
        ...(process.platform !== 'darwin' ? { titleBarOverlay: true } : {}),
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
    ipcMain.handle('create-note', async (event, { folder_id, title, contentJson }) => {
        return new Promise((resolve, reject) => {
            createNote(folder_id, title, contentJson, (err, noteId) => {
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
    
    ipcMain.handle('rename-note', async (event, { id, newTitle }) => {
        return new Promise((resolve, reject) => {
            renameNote(id, newTitle, (err, changes) => {
                if (err) reject(err);
                else resolve(changes);
            });
        });
    });
    
    ipcMain.handle('update-note', async (event, { id, contentJson }) => {
        return new Promise((resolve, reject) => {
            updateNote(id, contentJson, (err, changes) => {
                if (err) reject(err);
                else resolve(changes);
            });
        });
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
}

// Set the app name for macOS
if (process.platform === 'darwin') {
    app.setName('Lumos');
}

// App lifecycle
app.whenReady().then(() => {
    // Only on macOS
    if (process.platform === 'darwin') {
        // Set dock icon
        const iconPath = path.join(__dirname, '..', 'rendered', 'assets', 'app_logo.png');
        const icon = nativeImage.createFromPath(iconPath);
        app.dock.setIcon(icon);
    }
    
    createWindow();
    setupIPC();
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
