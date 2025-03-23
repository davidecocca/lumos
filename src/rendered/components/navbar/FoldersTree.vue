<template>
    <!-- Favorites notes section -->
    <v-list v-if="favoriteNotes.length > 0">
        <!-- Favorite notes header -->
        <div class="d-flex align-center mr-1">
            <v-list-subheader class="flex-grow-1">Favorites</v-list-subheader>
        </div>
        
        <!-- Favorite notes list -->
        <v-list-item
        v-for="(note, k) in favoriteNotes"
        :key="k"
        :title="note.title"
        prepend-icon="mdi-file-document-outline"
        @click="openNote(note.title)"
        class="pr-1"
        >
        <template v-slot:append>
            <!-- Note action buttons -->
            <div class="d-flex align-center">
                <!-- Toogle favorite -->
                <v-tooltip text="Remove from favorites" location="top">
                    <template v-slot:activator="{ props }">
                        <v-btn
                        v-bind="props"
                        icon="mdi-heart-broken"
                        size="small"
                        variant="text"
                        @click.stop="toggleNoteFavorite(note.id)"
                        ></v-btn>
                    </template>
                </v-tooltip>
                
                <!-- Rename note -->
                <v-tooltip text="Rename" location="top">
                    <template v-slot:activator="{ props }">
                        <v-btn
                        v-bind="props"
                        icon="mdi-rename-outline"
                        size="small"
                        variant="text"
                        @click.stop="openRenameNoteDialog(note.id, note.title)"
                        ></v-btn>
                    </template>
                </v-tooltip>
                
                <!-- Delete note -->
                <v-tooltip text="Delete" location="top">
                    <template v-slot:activator="{ props }">
                        <v-btn
                        v-bind="props"
                        icon="mdi-delete-outline"
                        size="small"
                        variant="text"
                        @click.stop="openDeleteNoteConfirmationDialog(note.id)"
                        ></v-btn>
                    </template>
                </v-tooltip>
            </div>
        </template>
    </v-list-item>
</v-list>

<v-divider></v-divider>

<!-- List of folders and notes -->
<v-list>
    <!-- Notes header with add folder button -->
    <div class="d-flex align-center mr-1">
        <v-list-subheader class="flex-grow-1">Notes</v-list-subheader>
        <v-tooltip text="New folder" location="top">
            <template v-slot:activator="{ props }">
                <v-btn
                v-bind="props"
                icon="mdi-folder-plus-outline"
                variant="text"
                size="small"
                @click="openCreateFolderDialog()"
                title="New folder"
                >
            </v-btn>
        </template>
    </v-tooltip>
</div>

<!-- Folders -->
<v-list-group
prepend-icon="mdi-folder-outline"
v-for="(folder, i) in folders"  
:key="folder.id"
>

<!-- Folder header with add note button -->
<template v-slot:activator="{ props, isOpen }">
    <v-list-item v-bind="props" class="pe-0" @click="getFolder(folder)">
        <template v-slot:append>
            <!-- Loading spinner -->
            <div v-if="folder.loading" class="mr-2">
                <v-progress-circular size="20" indeterminate></v-progress-circular>
            </div>
            
            <!-- New note button -->
            <div class="d-flex align-center mr-1">
                <v-tooltip text="New note" location="top">
                    <template v-slot:activator="{ props }">
                        <v-btn
                        v-bind="props"
                        icon="mdi-plus"
                        variant="text"
                        size="small"
                        @click.stop="openCreateNoteDialog(folder.id)"
                        title="New note"
                        ></v-btn>
                    </template>
                </v-tooltip>
                
                <!-- Folder actions menu -->
                <v-menu>
                    <template v-slot:activator="{ props }">
                        <v-tooltip text="Delete, rename, ..." location="top">
                            <template v-slot:activator="{ props: tooltipProps }">
                                <v-btn
                                v-bind="{ ...props, ...tooltipProps }"
                                icon="mdi-dots-horizontal"
                                size="small"
                                variant="text"
                                >
                            </v-btn>
                        </template>
                    </v-tooltip>
                </template>
                <v-list density="compact">
                    <!-- Rename -->
                    <v-list-item @click="openRenameFolderDialog(folder.id, folder.name)">
                        <template v-slot:append>
                            <v-icon icon="mdi-rename-outline"></v-icon>
                        </template>
                        <v-list-item-title>Rename</v-list-item-title>
                    </v-list-item>
                    
                    <!-- Delete -->
                    <v-list-item @click="openDeleteFolderConfirmationDialog(folder.id)">
                        <template v-slot:append>
                            <v-icon icon="mdi-delete-outline"></v-icon>
                        </template>
                        <v-list-item-title>Delete</v-list-item-title>
                    </v-list-item>
                </v-list>
            </v-menu>
            
            <!-- Collapse/expand arrow -->
            <div style="min-width: 40px; min-height: 40px;" class="d-flex align-center justify-center">
                <v-tooltip :text="isOpen ? 'Collapse' : 'Expand'" location="top">
                    <template v-slot:activator="{ props }">
                        <v-icon :icon="isOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'" v-bind="props"></v-icon>
                    </template>
                </v-tooltip>
            </div>
        </div>
    </template>
    <v-list-item-title>{{ folder.name }}</v-list-item-title>
</v-list-item>
</template>

<!-- Notes -->
<v-list-item 
v-for="(note, k) in folder.notes"  
:key="k" 
:title="note.title"
prepend-icon="mdi-file-document-outline"
@click="openNote(note.title)"
class="pr-1"
>
<template v-slot:append>
    <!-- Note action buttons -->
    <div class="d-flex align-center">
        <!-- Note actions menu -->
        <v-menu>
            <template v-slot:activator="{ props }">
                <v-tooltip text="Rename, move to, ..." location="top">
                    <template v-slot:activator="{ props: tooltipProps }">
                        <v-btn
                        v-bind="{ ...props, ...tooltipProps }"
                        icon="mdi-dots-horizontal"
                        size="small"
                        variant="text"
                        >
                    </v-btn>
                </template>
            </v-tooltip>
        </template>
        <v-list density="compact">
            <!-- Toggle note favorite -->
            <v-list-item @click="toggleNoteFavorite(note.id)">
                <template v-slot:append>
                    <v-icon :icon="note.isFavorite ? 'mdi-heart-broken' : 'mdi-heart'"></v-icon>
                </template>
                <v-list-item-title>{{ note.isFavorite ? 'Remove from favorites' : 'Add to favorites' }}</v-list-item-title>
            </v-list-item>
            
            <v-divider></v-divider>
            
            <!-- Rename -->
            <v-list-item @click="openRenameNoteDialog(note.id, note.title)">
                <template v-slot:append>
                    <v-icon icon="mdi-rename-outline"></v-icon>
                </template>
                <v-list-item-title>Rename</v-list-item-title>
            </v-list-item>
            
            <!-- Move to -->
            <v-list-item @click="openMoveNoteDialog(note.id, folder.id)">
                <template v-slot:append>
                    <v-icon icon="mdi-file-move-outline"></v-icon>
                </template>
                <v-list-item-title>Move to</v-list-item-title>
            </v-list-item>
        </v-list>
    </v-menu>
    
    <v-tooltip text="Delete" location="top">
        <template v-slot:activator="{ props }">
            <v-btn
            v-bind="props"
            icon="mdi-delete-outline"
            size="small"
            variant="text"
            @click.stop="openDeleteNoteConfirmationDialog(note.id)"
            ></v-btn>
        </template>
    </v-tooltip>
</div>
</template>
</v-list-item>

<!-- No notes message -->
<v-list-item
v-if="folder.notes.length === 0"
prepend-icon="mdi-package-variant"
>
<v-list-item-subtitle>No notes in this folder.</v-list-item-subtitle>
</v-list-item>
</v-list-group>

<!-- No notes message -->
<v-list-item
v-if="folders.length === 0"
prepend-icon="mdi-package-variant"
>
<v-list-item-subtitle>No folders.</v-list-item-subtitle>
<v-list-item-subtitle>Create a new folder to get started!</v-list-item-subtitle>
</v-list-item>

</v-list>

<!-- New folder dialog -->
<CreateFolderDialog
v-model="addFolderDialog"
@create-folder="createFolder"
/>

<!-- Rename folder dialog -->
<RenameFolderDialog
v-model="renameFolderDialog"
:folderId="activeFolderId"
:oldFolderName="activeFolderName"
@rename-folder="renameFolder"
/>

<!-- Delete folder confirmation dialog -->
<ConfirmDeleteFolderDialog
v-model="deleteFolderDialog"
:confirmationDialogTitle="confirmationDialogTitle"
:confirmationDialogText="confirmationDialogText"
:confirmationDialogButtonColor="confirmationDialogButtonColor"
:folderId="activeFolderId"
@delete-folder="deleteFolder"
/>

<!-- New note dialog -->
<CreateNoteDialog
v-model="createNoteDialog"
:folderId="activeFolderId"
@create-note="createNote"
/>

<!-- Rename note dialog -->
<RenameNoteDialog
v-model="renameNoteDialog"
:noteId="activeNoteId"
:currentNoteTitle="activeNoteTitle"
@rename-note="renameNote"
/>

<!-- Move note to folder dialog -->
<MoveToFolderDialog
v-model="moveToFolderDialog"
:folders="folders"
:noteId="activeNoteId"
:currentFolderId="activeNoteCurrentFolderId"
@move-note="moveNote"
/>

<!-- Delete note confirmation dialog -->
<ConfirmDeleteNoteDialog
v-model="deleteNoteDialog"
:confirmationDialogTitle="confirmationDialogTitle"
:confirmationDialogText="confirmationDialogText"
:confirmationDialogButtonColor="confirmationDialogButtonColor"
:noteId="activeNoteId"
@delete-note="deleteNote"
/>

<!-- Alert dialog for errors -->
<ErrorDialog
v-model="isErrorDialogVisible"
:errorDialogText="errorDialogText"
:errorDialogTitle="errorDialogTitle"
:errorDialogDetails="errorDialogDetails"
/>

</template>

<script setup>
import CreateFolderDialog from './CreateFolderDialog.vue'
import RenameFolderDialog from './RenameFolderDialog.vue'
import ConfirmDeleteFolderDialog from './ConfirmDeleteFolderDialog.vue'
import CreateNoteDialog from './CreateNoteDialog.vue'
import RenameNoteDialog from './RenameNoteDialog.vue'
import MoveToFolderDialog from './MoveToFolderDialog.vue'
import ConfirmDeleteNoteDialog from './../commons/ConfirmDeleteNoteDialog.vue'
import ErrorDialog from '../commons/ErrorDialog.vue'

import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// State for folders
const folders = ref([])

// State for favorite notes
const favoriteNotes = ref([])

// Folder dialogs state
const addFolderDialog = ref(false)
const renameFolderDialog = ref(false)
const deleteFolderDialog = ref(false)
const activeFolderId = ref(null)
const activeFolderName = ref('')

// Note dialogs state
const createNoteDialog = ref(false)
const renameNoteDialog = ref(false)
const moveToFolderDialog = ref(false)
const deleteNoteDialog = ref(false)
const activeNoteId = ref(null)
const activeNoteTitle = ref('')
const activeNoteCurrentFolderId = ref(null)

// Error dialog state
const isErrorDialogVisible = ref(false)
const errorDialogTitle = ref('')
const errorDialogText = ref('')
const errorDialogDetails = ref('')

// Confirmation dialog common state
const confirmationDialogTitle = ref('')
const confirmationDialogText = ref('')
const confirmationDialogButtonColor = ref('primary')


const fectchFolders = async () => {
    try {
        const results = await window.api.listFolders()
        folders.value = results.map(folder => ({
            ...folder,
            notes: [],
            isOpen: false,
            loading: false
        }))
    } catch (err) {
        console.error('Error fetching folders:', err)
    }
}

const fetchFavoriteNotes = async () => {
    try {
        const results = await window.api.getFavoriteNotes()
        favoriteNotes.value = results.map(note => ({
            ...note,
            title: note.title,
            id: note.id,
            isFavorite: note.isFavorite
        }))
    } catch (err) {
        console.error('Error fetching favorite notes:', err)
    }
}

onMounted(async () => {
    await fectchFolders()
    await fetchFavoriteNotes()
})

const loadFolderNotes = async (folder) => {
    folder.loading = true
    try {
        const notes = await window.api.getFolder(folder.id)
        folder.notes = notes.map(note => ({ ...note, title: note.title, id: note.id, isFavorite: note.isFavorite }))
    } catch (err) {
        console.error('Error fetching notes:', err)
    } finally {
        folder.loading = false
    }
}

const getFolder = async (folder) => {
    folder.isOpen = !folder.isOpen
    
    if (folder.isOpen) {
        await loadFolderNotes(folder)
    }
}

const openCreateFolderDialog = () => {
    addFolderDialog.value = true
}

const createFolder = async (folderName) => {
    if (folderName) {
        try {
            const folderId = await window.api.createFolder(folderName)
            folders.value.push({
                name: folderName,
                id: folderId,
                notes: [],
                loading: false
            })
            // Reorder the folders by name
            folders.value.sort((a, b) => a.name.localeCompare(b.name))
            addFolderDialog.value = false
        } catch (err) {
            console.error('Error creating folder:', err)
            // Show error alert
            errorDialogText.value = 'An error occurred while creating the folder.'
            errorDialogTitle.value = 'Folder Creation Error'
            errorDialogDetails.value = err.message
            isErrorDialogVisible.value = true
        }
    }
}
const openDeleteFolderConfirmationDialog = (folderId) => {
    activeFolderId.value = folderId
    confirmationDialogTitle.value = 'Delete Folder'
    confirmationDialogText.value = 'Are you sure you want to remove this folder and all its notes? This action cannot be undone.'
    confirmationDialogButtonColor.value = 'warning'
    deleteFolderDialog.value = true
}

const deleteFolder = async (folderId) => {
    try {
        // Delete all notes in the folder
        await window.api.deleteNotesInFolder(folderId)
        // Delete the folder
        await window.api.deleteFolder(folderId)
        folders.value = folders.value.filter(folder => folder.id !== folderId)
        deleteFolderDialog.value = false
    } catch (err) {
        console.error('Error deleting folder:', err)
        // Show error alert
        errorDialogText.value = 'An error occurred while deleting the folder.'
        errorDialogTitle.value = 'Folder Deletion Error'
        errorDialogDetails.value = err.message
        isErrorDialogVisible.value = true
    }
}

const openRenameFolderDialog = (folderId, folderName) => {
    activeFolderId.value = folderId
    activeFolderName.value = folderName
    renameFolderDialog.value = true
}

const renameFolder = async (folderId, newFolderName) => {
    if (newFolderName) {
        try {
            await window.api.updateFolder(folderId, newFolderName)
            const folder = folders.value.find(folder => folder.id === folderId)
            if (folder) {
                folder.name = newFolderName
                // Reorder the folders by name
                folders.value.sort((a, b) => a.name.localeCompare(b.name))
            }
            renameFolderDialog.value = false
        } catch (err) {
            console.error('Error renaming folder:', err)
            // Show error alert
            errorDialogText.value = 'An error occurred while renaming the folder.'
            errorDialogTitle.value = 'Folder Renaming Error'
            errorDialogDetails.value = err.message
            isErrorDialogVisible.value = true
        }
    }
}

const openCreateNoteDialog = (folderId) => {
    activeFolderId.value = folderId
    createNoteDialog.value = true
}

const createNote = async (folderId, noteTitle) => {
    // Create an empty note in the selected folder
    if (noteTitle) {
        try {
            const payload = {
                folder_id: folderId,
                title: noteTitle,
                contentJson: '{}',
            }
            const noteId = await window.api.createNote(payload)
            const folder = folders.value.find(folder => folder.id === folderId)
            if (folder) {
                folder.notes.push({ title: noteTitle, id: noteId })
                // Reorder the notes by title
                folder.notes.sort((a, b) => a.title.localeCompare(b.title))
            }
            createNoteDialog.value = false
        } catch (err) {
            console.error('Error creating note:', err)
            // Show error alert
            errorDialogText.value = 'An error occurred while creating the note.'
            errorDialogTitle.value = 'Note Creation Error'
            errorDialogDetails.value = err.message
            isErrorDialogVisible.value = true
        }
    }
}

const openRenameNoteDialog = (noteId, noteTitle) => {
    activeNoteId.value = noteId
    activeNoteTitle.value = noteTitle
    renameNoteDialog.value = true
}

const renameNote = async (noteId, newNoteTitle) => {
    if (newNoteTitle) {
        try {
            await window.api.renameNote(noteId, newNoteTitle)
            const folder = folders.value.find(folder => folder.notes.some(note => note.id === noteId))
            if (folder) {
                const note = folder.notes.find(note => note.id === noteId)
                if (note) {
                    note.title = newNoteTitle
                    // Reorder the notes by title
                    folder.notes.sort((a, b) => a.title.localeCompare(b.title))
                }
            }
            renameNoteDialog.value = false
        } catch (err) {
            console.error('Error renaming note:', err)
            // Show error alert
            errorDialogText.value = 'An error occurred while renaming the note.'
            errorDialogTitle.value = 'Note Renaming Error'
            errorDialogDetails.value = err.message
            isErrorDialogVisible.value = true
        }
    }
}

const openMoveNoteDialog = (noteId, noteFolderId) => {
    activeNoteId.value = noteId
    activeNoteCurrentFolderId.value = noteFolderId
    moveToFolderDialog.value = true
}

const moveNote = async (noteId, newFolderId) => {
    try {
        await window.api.moveNoteToFolder(noteId, newFolderId)
        
        // Remove note from the current folder
        const currentFolder = folders.value.find(folder => folder.id === activeNoteCurrentFolderId.value)
        if (currentFolder) {
            currentFolder.notes = currentFolder.notes.filter(note => note.id !== noteId)
        }
        // Add note to the new folder
        const newFolder = folders.value.find(folder => folder.id === newFolderId)
        if (newFolder) {
            const note = await window.api.getNote(noteId)
            newFolder.notes.push({ ...note, id: noteId })
            // Reorder the notes by title
            newFolder.notes.sort((a, b) => a.title.localeCompare(b.title))
        }
        // Close the move dialog
        moveToFolderDialog.value = false
    } catch (err) {
        console.error('Error moving note:', err)
        // Show error alert
        errorDialogText.value = 'An error occurred while moving the note.'
        errorDialogTitle.value = 'Note Moving Error'
        errorDialogDetails.value = err.message
        isErrorDialogVisible.value = true
    }
}

const openDeleteNoteConfirmationDialog = (noteId) => {
    activeNoteId.value = noteId
    confirmationDialogTitle.value = 'Delete Note'
    confirmationDialogText.value = 'Are you sure you want to remove this note? This action cannot be undone.'
    confirmationDialogButtonColor.value = 'warning'
    deleteNoteDialog.value = true
}

const deleteNote = async (noteId) => {
    try {
        await window.api.deleteNote(noteId)
        const folder = folders.value.find(folder => folder.notes.some(note => note.id === noteId))
        if (folder) {
            folder.notes = folder.notes.filter(note => note.id !== noteId)
        }
        deleteNoteDialog.value = false
    } catch (err) {
        console.error('Error deleting note:', err)
        // Show error alert
        errorDialogText.value = 'An error occurred while deleting the note.'
        errorDialogTitle.value = 'Note Deletion Error'
        errorDialogDetails.value = err.message
        isErrorDialogVisible.value = true
    }
}

const toggleNoteFavorite = async (noteId) => {
    try {
        const folder = folders.value.find(folder => folder.notes.some(note => note.id === noteId))
        if (folder) {
            const note = folder.notes.find(note => note.id === noteId)
            if (note) {
                const payload = {
                    id: noteId,
                    isFavorite: !note.isFavorite
                }
                await window.api.setNoteFavorite(payload)
                note.isFavorite = !note.isFavorite
            }
        }
    } catch (err) {
        console.error('Error adding to favorites:', err)
        // Show error alert
        errorDialogText.value = 'An error occurred while adding the note to favorites.'
        errorDialogTitle.value = 'Add to Favorites Error'
        errorDialogDetails.value = err.message
        isErrorDialogVisible.value = true
    }
}

const openNote = (noteTitle) => {
    router.push({ name: 'notes', params: { title: noteTitle } })
}
</script>