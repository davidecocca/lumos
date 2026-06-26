const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    platform: process.platform,
    windowMinimize: () => ipcRenderer.send('window-minimize'),
    windowMaximize: () => ipcRenderer.send('window-maximize'),
    windowClose: () => ipcRenderer.send('window-close'),
    openDevTools: () => ipcRenderer.send('open-devtools'),
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
    importNoteImage: (payload) => ipcRenderer.invoke('import-note-image', payload),
    deleteNote: (id) => ipcRenderer.invoke('delete-note', id),
    moveNoteToFolder: (payload) => ipcRenderer.invoke('move-note-to-folder', payload),
    deleteNotesInFolder: (folderId) => ipcRenderer.invoke('delete-notes-in-folder', folderId),
    setNoteFavorite: (payload) => ipcRenderer.invoke('set-note-favorite', payload),
    updateNoteLastViewed: (id) => ipcRenderer.invoke('update-note-last-viewed', id),
    getFavoriteNotes: () => ipcRenderer.invoke('get-favorite-notes'),
    getLastViewedNotes: () => ipcRenderer.invoke('get-last-viewed-notes'),
    searchNotes: (payload) => ipcRenderer.invoke('search-notes', payload),
    searchSimilarNotes: (payload) => ipcRenderer.invoke('search-similar-notes', payload),

    // Chat
    createChatConversation: (payload) => ipcRenderer.invoke('create-chat-conversation', payload),
    listChatConversations: (payload) => ipcRenderer.invoke('list-chat-conversations', payload),
    getChatConversation: (id) => ipcRenderer.invoke('get-chat-conversation', id),
    appendChatMessage: (payload) => ipcRenderer.invoke('append-chat-message', payload),
    updateChatConversation: (payload) => ipcRenderer.invoke('update-chat-conversation', payload),
    deleteChatConversation: (id) => ipcRenderer.invoke('delete-chat-conversation', id),
    
    // IPC events
    on: (channel, callback) => ipcRenderer.on(channel, callback),
    once: (channel, callback) => ipcRenderer.once(channel, callback),
    removeListener: (channel, callback) => ipcRenderer.removeListener(channel, callback),
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});
