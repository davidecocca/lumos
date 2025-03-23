const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Folders
    createFolder: (name) => ipcRenderer.invoke('create-folder', name),
    getFolder: (id) => ipcRenderer.invoke('get-folder', id),
    updateFolder: (payload) => ipcRenderer.invoke('update-folder', payload),
    deleteFolder: (id) => ipcRenderer.invoke('delete-folder', id),
    listFolders: () => ipcRenderer.invoke('list-folders'),
    
    // Notes
    createNote: (payload) => ipcRenderer.invoke('create-note', payload),
    getNote: (id) => ipcRenderer.invoke('get-note', id),
    renameNote: (payload) => ipcRenderer.invoke('rename-note', payload),
    updateNote: (payload) => ipcRenderer.invoke('update-note', payload),
    deleteNote: (id) => ipcRenderer.invoke('delete-note', id),
    moveNoteToFolder: (payload) => ipcRenderer.invoke('move-note-to-folder', payload),
    deleteNotesInFolder: (folderId) => ipcRenderer.invoke('delete-notes-in-folder', folderId),
    setNoteFavorite: (payload) => ipcRenderer.invoke('set-note-favorite', payload),
    updateNoteLastViewed: (id) => ipcRenderer.invoke('update-note-last-viewed', id),
    getFavoriteNotes: () => ipcRenderer.invoke('get-favorite-notes'),
});
