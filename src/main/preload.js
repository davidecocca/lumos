const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    platform: process.platform,
    windowMinimize: () => ipcRenderer.send('window-minimize'),
    windowMaximize: () => ipcRenderer.send('window-maximize'),
    windowClose: () => ipcRenderer.send('window-close'),
    toggleFullscreen: () => ipcRenderer.send('window-toggle-fullscreen'),
    openDevTools: () => ipcRenderer.send('open-devtools'),
    updateMenuState: (state) => ipcRenderer.send('update-menu-state', state),
    getAppInfo: () => ipcRenderer.invoke('get-app-info'),
    exportNote: (payload) => ipcRenderer.invoke('export-note', payload),
    getCodexStatus: () => ipcRenderer.invoke('get-codex-status'),
    runCodex: (payload) => ipcRenderer.invoke('run-codex', payload),
    startCodexStream: (payload) =>
        ipcRenderer.invoke('start-codex-stream', payload),
    onCodexStream: (callback) => {
        const listener = (_, event) => callback(event);
        ipcRenderer.on('codex-stream', listener);
        return () => ipcRenderer.removeListener('codex-stream', listener);
    },
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
    importNoteImage: (payload) =>
        ipcRenderer.invoke('import-note-image', payload),
    deleteNote: (id) => ipcRenderer.invoke('delete-note', id),
    moveNoteToFolder: (payload) =>
        ipcRenderer.invoke('move-note-to-folder', payload),
    deleteNotesInFolder: (folderId) =>
        ipcRenderer.invoke('delete-notes-in-folder', folderId),
    setNoteFavorite: (payload) =>
        ipcRenderer.invoke('set-note-favorite', payload),
    updateNoteLastViewed: (id) =>
        ipcRenderer.invoke('update-note-last-viewed', id),
    getFavoriteNotes: () => ipcRenderer.invoke('get-favorite-notes'),
    getLastViewedNotes: () => ipcRenderer.invoke('get-last-viewed-notes'),
    searchNotes: (payload) => ipcRenderer.invoke('search-notes', payload),
    searchSimilarNotes: (payload) =>
        ipcRenderer.invoke('search-similar-notes', payload),

    // RAG index management
    getRagStatus: () => ipcRenderer.invoke('rag-get-status'),
    rebuildRagIndex: () => ipcRenderer.invoke('rag-rebuild'),
    onRagStatus: (callback) => {
        const listener = (_, status) => callback(status);
        ipcRenderer.on('rag-status', listener);
        return () => ipcRenderer.removeListener('rag-status', listener);
    },
    onFlushSaves: (callback) => {
        const listener = () => callback();
        ipcRenderer.on('flush-saves', listener);
        return () => ipcRenderer.removeListener('flush-saves', listener);
    },

    // Chat
    createChatConversation: (payload) =>
        ipcRenderer.invoke('create-chat-conversation', payload),
    listChatConversations: (payload) =>
        ipcRenderer.invoke('list-chat-conversations', payload),
    getChatConversation: (id) =>
        ipcRenderer.invoke('get-chat-conversation', id),
    appendChatMessage: (payload) =>
        ipcRenderer.invoke('append-chat-message', payload),
    updateChatConversation: (payload) =>
        ipcRenderer.invoke('update-chat-conversation', payload),
    deleteChatConversation: (id) =>
        ipcRenderer.invoke('delete-chat-conversation', id),

    // IPC events
    on: (channel, callback) => ipcRenderer.on(channel, callback),
    once: (channel, callback) => ipcRenderer.once(channel, callback),
    removeListener: (channel, callback) =>
        ipcRenderer.removeListener(channel, callback),
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});
