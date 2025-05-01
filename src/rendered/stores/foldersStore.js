import { defineStore } from 'pinia'

export const useFoldersStore = defineStore('folders', {
    state: () => ({
        folders: [],
        favorites: [],  // Favorites state is unsorted; getter returns a sorted copy.
        recents: [],    // Recently viewed notes state is unsorted; getter returns a sorted copy.
        // Dialogs state
        addFolderDialog: false,
        renameFolderDialog: false,
        deleteFolderDialog: false,
        createNoteDialog: false,
        renameNoteDialog: false,
        moveToFolderDialog: false,
        deleteNoteDialog: false,
        // Active folder state
        activeFolderId: null,
        activeFolderName: '',
        // Active note state
        activeNoteId: null,
        activeNoteTitle: '',
        activeNoteCurrentFolderId: null,
        // Error dialog state
        isErrorDialogVisible: false,
        errorDialogTitle: '',
        errorDialogText: '',
        errorDialogDetails: '',
        // Confirmation dialog state
        confirmationDialogTitle: '',
        confirmationDialogText: '',
        confirmationDialogButtonColor: 'primary'
    }),
    getters: {
        favoriteNotes(state) {
            // Return favorite notes sorted by title
            return state.favorites.slice().sort((a, b) => a.title.localeCompare(b.title))
        },
        recentNotes(state) {
            // Return recent notes sorted by access date (descending)
            return state.recents.slice().sort((a, b) => new Date(b.accessedAt) - new Date(a.accessedAt))
        }
    },
    actions: {
        async fetchFolders() {
            try {
                const results = await window.api.listFolders()
                this.folders = results.map(folder => ({
                    ...folder,
                    notes: [],
                    isOpen: false,
                    loading: false
                }))
            } catch (err) {
                console.error('Error fetching folders:', err)
            }
        },
        async fetchFavoriteNotes() {
            try {
                const favNotes = await window.api.getFavoriteNotes()
                this.favorites = favNotes.map(note => ({
                    ...note,
                }))
            } catch (err) {
                console.error('Error fetching favorite notes:', err)
            }
        },
        async fetchLastViewedNotes() {
            try {
                const recentNotes = await window.api.getLastViewedNotes()
                this.recents = recentNotes.map(note => ({
                    ...note,
                }))
            } catch (err) {
                console.error('Error fetching recent notes:', err)
            }
        },
        async loadFolderNotes(folder) {
            folder.loading = true
            try {
                const notes = await window.api.getFolderContent(folder.id)
                folder.notes = notes
            } catch (err) {
                console.error('Error fetching notes:', err)
            } finally {
                folder.loading = false
            }
        },
        async toggleFolderOpen(folder) {
            folder.isOpen = !folder.isOpen
            if (folder.isOpen) {
                await this.loadFolderNotes(folder)
            }
        },
        openCreateFolderDialog() {
            this.addFolderDialog = true
        },
        async createFolder(folderName) {
            if (folderName) {
                try {
                    const folderId = await window.api.createFolder(folderName)
                    this.folders.push({
                        name: folderName,
                        id: folderId,
                        notes: [],
                        loading: false
                    })
                    this.folders.sort((a, b) => a.name.localeCompare(b.name))
                    this.addFolderDialog = false
                } catch (err) {
                    console.error('Error creating folder:', err)
                    this.errorDialogText = 'An error occurred while creating the folder.'
                    this.errorDialogTitle = 'Folder Creation Error'
                    this.errorDialogDetails = err.message
                    this.isErrorDialogVisible = true
                }
            }
        },
        openDeleteFolderConfirmationDialog(folderId) {
            this.activeFolderId = folderId
            this.confirmationDialogTitle = 'Delete Folder'
            this.confirmationDialogText = 'Are you sure you want to remove this folder and all its notes? This action cannot be undone.'
            this.confirmationDialogButtonColor = 'warning'
            this.deleteFolderDialog = true
        },
        async deleteFolder(folderId) {
            try {
                // Get all ids of notes in the folder
                const notes = await window.api.getFolderContent(folderId)
                const noteIds = notes.map(note => note.id)
                // First delete all notes in the folder
                await window.api.deleteNotesInFolder(folderId)
                // Then delete the folder itself
                await window.api.deleteFolder(folderId)
                // Remove the folder from the folders array
                this.folders = this.folders.filter(folder => folder.id !== folderId)
                // Remove deleted notes from favorites and recents
                this.favorites = this.favorites.filter(note => !noteIds.includes(note.id))
                this.recents = this.recents.filter(note => !noteIds.includes(note.id))
                this.deleteFolderDialog = false
            } catch (err) {
                console.error('Error deleting folder:', err)
                this.errorDialogText = 'An error occurred while deleting the folder.'
                this.errorDialogTitle = 'Folder Deletion Error'
                this.errorDialogDetails = err.message
                this.isErrorDialogVisible = true
            }
        },
        openRenameFolderDialog(folderId, folderName) {
            this.activeFolderId = folderId
            this.activeFolderName = folderName
            this.renameFolderDialog = true
        },
        async renameFolder(folderId, newFolderName) {
            if (newFolderName) {
                try {
                    await window.api.updateFolder({id: folderId, newName: newFolderName})
                    const folder = this.folders.find(folder => folder.id === folderId)
                    if (folder) {
                        folder.name = newFolderName
                        this.folders.sort((a, b) => a.name.localeCompare(b.name))
                    }
                    this.renameFolderDialog = false
                } catch (err) {
                    console.error('Error renaming folder:', err)
                    this.errorDialogText = 'An error occurred while renaming the folder.'
                    this.errorDialogTitle = 'Folder Renaming Error'
                    this.errorDialogDetails = err.message
                    this.isErrorDialogVisible = true
                }
            }
        },
        openCreateNoteDialog(folderId) {
            this.activeFolderId = folderId
            this.createNoteDialog = true
        },
        async createNote(folderId, noteTitle) {
            if (noteTitle) {
                try {
                    const payload = { folder_id: folderId, title: noteTitle, contentJson: '{}' }
                    const noteId = await window.api.createNote(payload)
                    const folder = this.folders.find(folder => folder.id === folderId)
                    if (folder) {
                        const newNote = await window.api.getNote(noteId)
                        folder.notes.push(newNote)
                        folder.notes.sort((a, b) => a.title.localeCompare(b.title))
                    }
                    this.createNoteDialog = false
                } catch (err) {
                    console.error('Error creating note:', err)
                    this.errorDialogText = 'An error occurred while creating the note.'
                    this.errorDialogTitle = 'Note Creation Error'
                    this.errorDialogDetails = err.message
                    this.isErrorDialogVisible = true
                }
            }
        },
        openRenameNoteDialog(noteId, noteTitle) {
            this.activeNoteId = noteId
            this.activeNoteTitle = noteTitle
            this.renameNoteDialog = true
        },
        async renameNote(noteId, newNoteTitle) {
            if (newNoteTitle) {
                try {
                    await window.api.renameNote({ id: noteId, newTitle: newNoteTitle })
                    // Update note in all loaded folder notes and re-sort each folder.
                    this.folders.forEach(folder => {
                        folder.notes.forEach(note => {
                            if (note.id === noteId) {
                                note.title = newNoteTitle
                            }
                        })
                        folder.notes.sort((a, b) => a.title.localeCompare(b.title))
                    })
                    // Update in favorites if present.
                    const favIndex = this.favorites.findIndex(note => note.id === noteId)
                    if (favIndex !== -1) {
                        this.favorites[favIndex].title = newNoteTitle
                    }
                    // Update in recents if present
                    const recentIndex = this.recents.findIndex(note => note.id === noteId)
                    if (recentIndex !== -1) {
                        this.recents[recentIndex].title = newNoteTitle
                    }
                    this.renameNoteDialog = false
                } catch (err) {
                    console.error('Error renaming note:', err)
                    this.errorDialogText = 'An error occurred while renaming the note.'
                    this.errorDialogTitle = 'Note Renaming Error'
                    this.errorDialogDetails = err.message
                    this.isErrorDialogVisible = true
                }
            }
        },
        openMoveNoteDialog(noteId, noteFolderId) {
            this.activeNoteId = noteId
            this.activeNoteCurrentFolderId = noteFolderId
            this.moveToFolderDialog = true
        },
        async moveNote(noteId, newFolderId) {
            try {
                await window.api.moveNoteToFolder({noteId: noteId, newFolderId: newFolderId})
                const currentFolder = this.folders.find(folder => folder.id === this.activeNoteCurrentFolderId)
                const newFolder = this.folders.find(folder => folder.id === newFolderId)
                
                if (currentFolder) {
                    currentFolder.notes = currentFolder.notes.filter(note => note.id !== noteId)
                }
                
                if (newFolder) {
                    const note = await window.api.getNote(noteId)
                    newFolder.notes.push({ ...note })
                    newFolder.notes.sort((a, b) => a.title.localeCompare(b.title))
                }
                
                // Update folder reference in favorites if present.
                const favIndex = this.favorites.findIndex(note => note.id === noteId)
                if (favIndex !== -1 && newFolder) {
                    this.favorites[favIndex].folderId = newFolderId
                    this.favorites[favIndex].folderName = newFolder.name
                }
                
                // Update folder reference in recents if present
                const recentIndex = this.recents.findIndex(note => note.id === noteId)
                if (recentIndex !== -1 && newFolder) {
                    this.recents[recentIndex].folderId = newFolderId
                    this.recents[recentIndex].folderName = newFolder.name
                }
                
                this.moveToFolderDialog = false
            } catch (err) {
                console.error('Error moving note:', err)
                this.errorDialogText = 'An error occurred while moving the note.'
                this.errorDialogTitle = 'Note Moving Error'
                this.errorDialogDetails = err.message
                this.isErrorDialogVisible = true
            }
        },
        openDeleteNoteConfirmationDialog(noteId) {
            this.activeNoteId = noteId
            this.confirmationDialogTitle = 'Delete Note'
            this.confirmationDialogText = 'Are you sure you want to remove this note? This action cannot be undone.'
            this.confirmationDialogButtonColor = 'warning'
            this.deleteNoteDialog = true
        },
        async deleteNote(noteId) {
            try {
                await window.api.deleteNote(noteId)
                const folder = this.folders.find(folder => folder.notes.some(note => note.id === noteId))
                if (folder) {
                    folder.notes = folder.notes.filter(note => note.id !== noteId)
                }
                // Remove from favorites if present.
                this.favorites = this.favorites.filter(note => note.id !== noteId)
                // Remove from recents if present
                this.recents = this.recents.filter(note => note.id !== noteId)
                this.deleteNoteDialog = false
            } catch (err) {
                console.error('Error deleting note:', err)
                this.errorDialogText = 'An error occurred while deleting the note.'
                this.errorDialogTitle = 'Note Deletion Error'
                this.errorDialogDetails = err.message
                this.isErrorDialogVisible = true
            }
        },
        async toggleNoteFavorite(noteId) {
            try {
                // Fetch the note to get the current favorite status
                const note = await window.api.getNote(noteId)
                // Toggle the favorite status
                const newFav = note.favorite === 0 ? 1 : 0
                // Update the note in the backend
                await window.api.setNoteFavorite({ id: noteId, isFavorite: newFav })
                
                // Update the note in all folder (if present)
                this.folders.forEach(folder => {
                    const noteIndex = folder.notes.findIndex(note => note.id === noteId)
                    if (noteIndex !== -1) {
                        // Update the note's favorite flag.
                        folder.notes[noteIndex] = { 
                            ...folder.notes[noteIndex],
                            favorite: newFav
                        }
                    }
                })
                
                // Update the note in the recents list (if present)
                const recentIndex = this.recents.findIndex(note => note.id === noteId)
                if (recentIndex !== -1) {
                    this.recents[recentIndex] = {
                        ...this.recents[recentIndex],
                        favorite: newFav
                    }
                }
                
                // Add or remove the note from favorites list
                const favIndex = this.favorites.findIndex(note => note.id === noteId)
                
                const updatedNote = {
                    ...note,
                    favorite: newFav
                }
                
                if (newFav === 1 && favIndex === -1) {
                    // Add to favorites
                    this.favorites.push(updatedNote)
                } else if (newFav === 0 && favIndex !== -1) {
                    // Remove from favorites
                    this.favorites.splice(favIndex, 1)
                }
            } catch (err) {
                console.error('Error toggling favorite:', err)
                this.errorDialogText = 'An error occurred while setting the note as favorite.'
                this.errorDialogTitle = 'Setting note as favorite Error'
                this.errorDialogDetails = err.message
                this.isErrorDialogVisible = true
            }
        },
        async openNote(noteId, router) {
            try {
                // Update last viewed time in the backend
                await window.api.updateNoteLastViewed(noteId)
                
                // Fetch the note to get the updated timestamp from backend
                const note = await window.api.getNote(noteId)
                
                // Update recents array
                const existingIndex = this.recents.findIndex(recent => recent.id === noteId)
                
                if (existingIndex !== -1) {
                    // Remove existing entry
                    this.recents.splice(existingIndex, 1)
                }
                
                // Add to recents
                this.recents.push(note)
                
                // Cap recents list at 10 items
                if (this.recents.length > 10) {
                    this.recents = this.recents.slice(-10)
                }
                
                // Navigate to the note
                router.push({ name: 'notes', params: { noteId } })
            } catch (err) {
                console.error('Error opening note:', err)
                this.errorDialogText = 'An error occurred while opening the note.'
                this.errorDialogTitle = 'Note Opening Error'
                this.errorDialogDetails = err.message
                this.isErrorDialogVisible = true
            }
        },
    }
})