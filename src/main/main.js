const { app, BrowserWindow, ipcMain, nativeImage, Menu } = require('electron');
const path = require('path');
const vectorStore = require('./database/vectorStore');

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

    ipcMain.handle('search-notes', async (event, { query, limit = 10, includeSemantic = true } = {}) => {
        const safeLimit = Math.max(1, Number(limit) || 10);
        const keywordResults = await new Promise((resolve, reject) => {
            searchNotes(query, safeLimit, (err, notes) => {
                if (err) reject(err);
                else resolve(notes);
            });
        });

        if (!includeSemantic || !String(query || '').trim()) {
            return keywordResults.map((note) => ({
                ...note,
                match_type: 'keyword',
            }));
        }

        const mergedResults = new Map(
            keywordResults.map((note) => [
                note.id,
                {
                    ...note,
                    match_type: 'keyword',
                }
            ])
        );

        try {
            const semanticMatches = await vectorStore.searchSimilarNotes(query, safeLimit);
            const semanticIds = [...new Set(
                semanticMatches
                .map((result) => Number(result.metadata?.source))
                .filter((id) => Number.isInteger(id))
            )];

            if (semanticIds.length > 0) {
                const semanticNotes = await new Promise((resolve, reject) => {
                    getNotesByIds(semanticIds, (err, notes) => {
                        if (err) reject(err);
                        else resolve(notes);
                    });
                });

                const semanticDistanceById = semanticMatches.reduce((distances, result) => {
                    const noteId = Number(result.metadata?.source);
                    const nextDistance = result.metadata?._distance;

                    if (!Number.isInteger(noteId) || typeof nextDistance !== 'number') {
                        return distances;
                    }

                    const currentDistance = distances.get(noteId);
                    if (currentDistance == null || nextDistance < currentDistance) {
                        distances.set(noteId, nextDistance);
                    }

                    return distances;
                }, new Map());

                semanticNotes.forEach((note) => {
                    const existingNote = mergedResults.get(note.id);
                    const semanticDistance = semanticDistanceById.get(note.id) ?? null;

                    if (existingNote) {
                        mergedResults.set(note.id, {
                            ...existingNote,
                            semantic_distance: semanticDistance,
                            match_type: 'hybrid',
                        });
                        return;
                    }

                    mergedResults.set(note.id, {
                        ...note,
                        semantic_distance: semanticDistance,
                        match_type: 'semantic',
                        keyword_score: 0,
                    });
                });
            }
        } catch (err) {
            console.warn('Semantic note search failed, falling back to keyword results:', err.message);
        }

        return [...mergedResults.values()].sort((left, right) => {
            const leftPriority = left.match_type === 'hybrid' ? 0 : left.match_type === 'keyword' ? 1 : 2;
            const rightPriority = right.match_type === 'hybrid' ? 0 : right.match_type === 'keyword' ? 1 : 2;

            if (leftPriority !== rightPriority) {
                return leftPriority - rightPriority;
            }

            const leftKeywordScore = left.keyword_score ?? 0;
            const rightKeywordScore = right.keyword_score ?? 0;
            if (leftKeywordScore !== rightKeywordScore) {
                return rightKeywordScore - leftKeywordScore;
            }

            const leftSemanticDistance = left.semantic_distance ?? Number.POSITIVE_INFINITY;
            const rightSemanticDistance = right.semantic_distance ?? Number.POSITIVE_INFINITY;
            if (leftSemanticDistance !== rightSemanticDistance) {
                return leftSemanticDistance - rightSemanticDistance;
            }

            const leftTimestamp = new Date(left.last_viewed_at || left.updated_at || 0).getTime();
            const rightTimestamp = new Date(right.last_viewed_at || right.updated_at || 0).getTime();
            return rightTimestamp - leftTimestamp;
        }).slice(0, safeLimit);
    });
    
    ipcMain.handle('search-similar-notes', async (event, { query, limit, filter }) => {
        return new Promise((resolve, reject) => {
            vectorStore.searchSimilarNotes(query, limit, filter)
            .then(results => resolve(results))
            .catch(err => reject(err));
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
