const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Folders
    createFolder: (name) => ipcRenderer.invoke('create-folder', name),
    getFolderContent: (id) => ipcRenderer.invoke('get-folder-content', id),
    getFolder: (id) => ipcRenderer.invoke('get-folder', id),
    updateFolder: (payload) => ipcRenderer.invoke('update-folder', payload),
    deleteFolder: (id) => ipcRenderer.invoke('delete-folder', id),
    listFolders: () => ipcRenderer.invoke('list-folders'),
    
    // Notes
    createNote: (payload) => ipcRenderer.invoke('create-note', payload),
    getNote: (id) => ipcRenderer.invoke('get-note', id),
    getNotesByIds: (ids) => ipcRenderer.invoke('get-notes-by-ids', ids),
    listNotes: () => ipcRenderer.invoke('list-notes'),
    renameNote: (payload) => ipcRenderer.invoke('rename-note', payload),
    updateNote: (payload) => ipcRenderer.invoke('update-note', payload),
    deleteNote: (id) => ipcRenderer.invoke('delete-note', id),
    moveNoteToFolder: (payload) => ipcRenderer.invoke('move-note-to-folder', payload),
    deleteNotesInFolder: (folderId) => ipcRenderer.invoke('delete-notes-in-folder', folderId),
    setNoteFavorite: (payload) => ipcRenderer.invoke('set-note-favorite', payload),
    updateNoteLastViewed: (id) => ipcRenderer.invoke('update-note-last-viewed', id),
    getFavoriteNotes: () => ipcRenderer.invoke('get-favorite-notes'),
    getLastViewedNotes: () => ipcRenderer.invoke('get-last-viewed-notes'),
    searchSimilarNotes: (payload) => ipcRenderer.invoke('search-similar-notes', payload),
    
    // IPC events
    on: (channel, callback) => ipcRenderer.on(channel, callback),
    once: (channel, callback) => ipcRenderer.once(channel, callback),
    removeListener: (channel, callback) => ipcRenderer.removeListener(channel, callback),
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});
