<template>
    <EditorHeader
        v-model:note-action-menu="editorNoteActionMenu"
        :note="note"
        :breadcrumbs-items="breadcrumbsItems"
        :editor="editor"
        @generate-ai="generateWithAIDialog = !generateWithAIDialog"
        @save="saveNoteManually"
        @toggle-favorite="toggleFavorite"
        @rename-note="openRenameNoteDialog"
        @move-note="openMoveNoteDialog"
        @delete-note="store.openDeleteNoteConfirmationDialog"
    />

    <EditorBubbleMenu
        :editor="editor"
        :should-show="shouldShowBubbleMenu"
        :append-to="getBubbleMenuAppendTarget"
        :can-remove-details="canRemoveDetails"
        :highlight-colors="highlightColors"
        :text-colors="textColors"
        :supported-tones="supportedTones"
        :supported-languages="supportedLanguages"
        @insert-details="insertDetails"
        @remove-details="removeDetails"
        @highlight="handleHighlight"
        @text-color="handleTextColor"
        @ai-edit="aiEdit"
        @ai-fix-grammar="aiFixGrammar"
        @ai-format-text="aiFormatText"
        @ai-improve-writing="aiImproveWriting"
        @ai-make-shorter="aiMakeShorter"
        @ai-make-longer="aiMakeLonger"
        @ai-simplify="aiSimplify"
        @ai-change-tone="aiChangeTone"
        @ai-translate-to="aiTranslateTo"
    />

    <EditorSurface
        :editor="editor"
        :is-loading="isLoading"
    />

    <EditorDialogs
        v-model:rename-note-dialog="renameNoteDialog"
        v-model:move-to-folder-dialog="moveToFolderDialog"
        v-model:delete-note-dialog="deleteNoteDialog"
        v-model:generateWithAIDialog="generateWithAIDialog"
        v-model:editWithAIDialog="editWithAIDialog"
        v-model:embed-youtube-dialog="embedYoutubeDialog"
        :note="note"
        :folders="store.folders"
        :selected-text="selectedText"
        :confirmation-dialog-title="confirmationDialogTitle"
        :confirmation-dialog-text="confirmationDialogText"
        :confirmation-dialog-button-color="confirmationDialogButtonColor"
        @rename-note="handleRenameNote"
        @move-note="handleMoveNote"
        @delete-note="handleDeleteNote"
        @apply-ai-edit="handleApply"
        @embed-youtube="handleyoutube"
    />
</template>

<script setup>
import EditorBubbleMenu from '../components/editor/EditorBubbleMenu.vue'
import EditorDialogs from '../components/editor/EditorDialogs.vue'
import EditorHeader from '../components/editor/EditorHeader.vue'
import EditorSurface from '../components/editor/EditorSurface.vue'
import { useEditorAITransforms, supportedLanguages, supportedTones } from '../components/editor/composables/useEditorAITransforms'
import TableSlashCommand, { OPEN_YOUTUBE_DIALOG_EVENT } from '../components/editor/slash-menu/slashCommand'

import { createLlmService } from '../services/llmService';
import getTopicPrompt from '../prompts/getTopicPrompt';

import { useRouter } from 'vue-router'
import { useFoldersStore } from '../stores/foldersStore'
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue'
import { isTextSelection } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Editor } from '@tiptap/vue-3'
import { Placeholder } from '@tiptap/extensions'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import Highlight from '@tiptap/extension-highlight'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { Details, DetailsContent, DetailsSummary } from '@tiptap/extension-details'
import { TaskList, TaskItem } from '@tiptap/extension-list'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import FileHandler from '@tiptap/extension-file-handler'
import EmbeddedYoutube from '../components/editor/custom-node-views/embedded-youtube/embeddedYoutube'
import ResizableImage from '../components/editor/custom-node-views/resizable-image/resizableImage'

// Code block highlighting: load all languages with "all" and common languages with "common"
import { all, createLowlight } from 'lowlight'

const IMAGE_MUTATION_EVENT = 'lumos-note-image-mutation'
const VIDEO_MUTATION_EVENT = 'lumos-note-video-mutation'
const DETAILS_OPEN_CLASS_NAME = 'is-open'
const EMPTY_EDITOR_DOCUMENT = {
    type: 'doc',
    content: [
    {
        type: 'paragraph',
    },
    ],
}

const props = defineProps({
    theme: {
        type: String,
        default: 'light',
    },
    noteId: {
        type: Number,
        mandatory: true,
    }
})

const router = useRouter()

// Central store for folders
const store = useFoldersStore()

// Init LLM service for topic generation
var getTopicService = null
try {
    getTopicService = createLlmService(getTopicPrompt, 'editor');
} catch (error) {
    console.error('Error initializing topic LLM service:', error);
}

// Reactive variables for dialogs
const renameNoteDialog = computed({
    get: () => store.renameNoteDialog,
    set: (val) => store.renameNoteDialog = val
})
const moveToFolderDialog = computed({
    get: () => store.moveToFolderDialog,
    set: (val) => store.moveToFolderDialog = val
})
const deleteNoteDialog = computed({
    get: () => store.deleteNoteDialog,
    set: (val) => store.deleteNoteDialog = val
})

const confirmationDialogTitle = computed(() => store.confirmationDialogTitle)
const confirmationDialogText = computed(() => store.confirmationDialogText)
const confirmationDialogButtonColor = computed(() => store.confirmationDialogButtonColor)

const generateWithAIDialog = ref(false)
const editWithAIDialog = ref(false)
const embedYoutubeDialog = ref(false)
const editorNoteActionMenu = ref(false)

const note = ref(null)
const selectedText = ref('')
const selectionFrom = ref(0)
const selectionTo = ref(0)

const shouldShowBubbleMenu = ({ state, from, to }) => (
isTextSelection(state.selection)
&& !state.selection.empty
&& from !== to
)

const currentFolderName = computed(() => {
    if (!note.value) return ''
    const folder = store.folders.find(f => f.id === note.value.folder_id)
    return folder ? folder.name : note.value.folder_name || ''
})

// Create a lowlight instance
const lowlight = createLowlight(all)

const editor = ref(null)
let noteRequestId = 0

const isLoading = ref(false)

const {
    aiEdit,
    handleApply,
    aiFixGrammar,
    aiFormatText,
    aiImproveWriting,
    aiMakeShorter,
    aiMakeLonger,
    aiSimplify,
    aiChangeTone,
    aiTranslateTo,
} = useEditorAITransforms({
    editor,
    isLoading,
    selectedText,
    selectionFrom,
    selectionTo,
    editWithAIDialog,
})

const highlightColors = computed(() => {
    const isDark = props.theme === 'dark'

    return [
        { name: 'Default', value: 'default', displayedColor: isDark ? '#212121' : '#FFFFFF' },
        { name: 'Red', value: 'var(--lumos-editor-highlight-red)', displayedColor: isDark ? '#E53935' : '#F8BBD0' },
        { name: 'Blue', value: 'var(--lumos-editor-highlight-blue)', displayedColor: isDark ? '#039BE5' : '#C5CAE9' },
        { name: 'Green', value: 'var(--lumos-editor-highlight-green)', displayedColor: isDark ? '#43A047' : '#B2DFDB' },
        { name: 'Yellow', value: 'var(--lumos-editor-highlight-yellow)', displayedColor: isDark ? '#F4511E' : '#FFECB3' },
    ]
})

const textColors = computed(() => {
    const isDark = props.theme === 'dark'

    return [
        { name: 'Default', value: 'default', displayedColor: isDark ? '#E0E0E0' : '#212121' },
        { name: 'Blue', value: 'var(--lumos-editor-text-blue)', displayedColor: isDark ? '#9FA8DA' : '#0D47A1' },
        { name: 'Red', value: 'var(--lumos-editor-text-red)', displayedColor: isDark ? '#F48FB1' : '#B71C1C' },
        { name: 'Green', value: 'var(--lumos-editor-text-green)', displayedColor: isDark ? '#80CBC4' : '#1B5E20' },
        { name: 'Orange', value: 'var(--lumos-editor-text-orange)', displayedColor: isDark ? '#FFCC80' : '#E65100' },
    ]
})

const breadcrumbsItems = computed(() => [
{
    title: currentFolderName.value,
    disabled: true,
},
{
    title: note.value ? note.value.title : '',
    disabled: false,
},
])

const handleHighlight = (colorValue) => {
    if (!editor.value) return;
    
    if (colorValue === 'default') {
        editor.value.chain().focus().unsetHighlight().run();
    } else {
        editor.value.chain().focus().setHighlight({ color: colorValue }).run();
    }
}

const handleTextColor = (colorValue) => {
    if (!editor.value) return;
    
    if (colorValue === 'default') {
        editor.value.chain().focus().unsetColor().run();
    } else {
        editor.value.chain().focus().setColor(colorValue).run();
    }
}

const getBubbleMenuAppendTarget = () => document.body

const renderDetailsToggleButton = ({ element, isOpen, node }) => {
    const label = node.textContent?.trim() || 'details'
    
    element.textContent = isOpen ? '▾' : '▸'
    element.setAttribute('aria-label', isOpen ? `Collapse details: ${label}` : `Expand details: ${label}`)
    element.classList.add('tiptap-details__toggle')
    
    if (!element.dataset.lumosDetailsBound) {
        element.dataset.lumosDetailsBound = 'true'
        element.addEventListener('click', () => {
            window.setTimeout(() => {
                if (!editor.value?.isEditable) {
                    return
                }
                
                const detailsElement = element.closest('[data-type="details"]')
                
                if (!detailsElement || !editor.value.isActive('details')) {
                    return
                }
                
                editor.value.commands.updateAttributes('details', {
                    open: detailsElement.classList.contains(DETAILS_OPEN_CLASS_NAME),
                })
            }, 0)
        })
    }
}

const canRemoveDetails = () => {
    if (!editor.value) {
        return false
    }
    
    return editor.value.can().chain().focus().unsetDetails().run()
}

const insertDetails = () => {
    if (!editor.value) {
        return
    }
    
    editor.value
    .chain()
    .focus()
    .setDetails()
    .updateAttributes('details', {
        open: true,
    })
    .run()
}

const removeDetails = () => {
    if (!editor.value || !canRemoveDetails()) {
        return
    }
    
    editor.value.chain().focus().unsetDetails().run()
}

const setEditorDocument = (contentJson) => {
    if (!editor.value) {
        return
    }
    
    const nextContent = contentJson && contentJson !== '{}'
    ? contentJson
    : EMPTY_EDITOR_DOCUMENT
    
    editor.value.commands.setContent(nextContent, {
        emitUpdate: false,
    })
}

const getNote = async (id) => {
    const requestId = ++noteRequestId
    
    // Get note from the database
    const noteInfo = await window.api.getNote(id)
    
    if (requestId !== noteRequestId) {
        return
    }
    
    // Get note folder from the database
    const folderInfo = await window.api.getFolder(noteInfo.folder_id)
    
    if (requestId !== noteRequestId) {
        return
    }
    
    note.value = noteInfo
    note.value.folderName = folderInfo.name
    
    // Set active note in the store
    store.activeNoteId = noteInfo.id
    store.activeNoteTitle = noteInfo.title
    store.activeNoteCurrentFolderId = noteInfo.folder_id
    store.editorNoteId = noteInfo.id
    store.editorNoteTitle = noteInfo.title
    store.editorNoteCurrentFolderId = noteInfo.folder_id
    store.editorNoteFavorite = noteInfo.favorite
    
    setEditorDocument(note.value?.content_json)
}

const persistEditorContent = async ({ refreshTopic = false } = {}) => {
    if (!editor.value || !note.value) {
        return
    }
    
    let topic = note.value.topic || ''
    
    if (refreshTopic && getTopicService) {
        topic = await getTopicService.generate(editor.value.getText())
    }
    
    const payload = {
        id: note.value.id,
        contentJson: editor.value.getJSON(),
        contentText: editor.value.getText(),
        topic,
    }
    
    await window.api.updateNote(payload)
    note.value.topic = topic
}

const saveNoteManually = async () => {
    try {
        // Enable loading state
        isLoading.value = true
        
        await persistEditorContent({ refreshTopic: true })
        
        // Stop loading state
        isLoading.value = false
    } catch (error) {
        const errorMsg = 'Failed to save note'
        console.error(errorMsg, error)
        isLoading.value = false
    }
}

const createImageNode = (source, altText = '', storageSrc = null) => ({
    type: 'noteImage',
    attrs: {
        src: source,
        storageSrc,
        alt: altText,
        title: altText,
        align: 'center',
    },
})

const isImageFile = (file) => (
file.type?.startsWith('image/')
|| /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name || '')
)

const insertImportedImages = async (files, insertPosition = null) => {
    if (!note.value?.id || !editor.value) {
        return false
    }
    
    const imageFiles = files.filter(isImageFile)
    
    if (!imageFiles.length) {
        return false
    }
    
    try {
        if (typeof insertPosition === 'number') {
            editor.value.chain().focus().setTextSelection(insertPosition).run()
        } else {
            editor.value.chain().focus().run()
        }
        
        for (const file of imageFiles) {
            const imageData = new Uint8Array(await file.arrayBuffer())
            const importedImage = await window.api.importNoteImage({
                noteId: note.value.id,
                fileName: file.name,
                mimeType: file.type,
                data: imageData,
            })
            
            editor.value.commands.setImage(
            createImageNode(importedImage.src, file.name, importedImage.storedSrc).attrs
            )
        }
        
        await persistEditorContent()
        return true
    } catch (error) {
        console.error('Failed to import dropped image:', error)
        return false
    }
}

const handleImageMutation = async () => {
    try {
        await persistEditorContent()
    } catch (error) {
        console.error('Failed to persist image change:', error)
    }
}

const handleVideoMutation = async () => {
    try {
        await persistEditorContent()
    } catch (error) {
        console.error('Failed to persist video change:', error)
    }
}

const handleKeyDown = (event) => {
    // For Mac, event.metaKey is Command; fallback to Ctrl for others
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        saveNoteManually()
    }
}

const handleRenameNote = async (noteId, newTitle) => {
    await store.renameNote(noteId, newTitle)
    
    if (store.editorNoteTitle) {
        note.value.title = store.editorNoteTitle
    }
}

const openRenameNoteDialog = (noteId, title) => {
    store.openRenameNoteDialog(noteId, title)
}

const toggleFavorite = async (noteId) => {
    await store.toggleNoteFavorite(noteId)
    
    if (store.editorNoteFavorite !== null) {
        note.value.favorite = store.editorNoteFavorite
    }
}

const openMoveNoteDialog = (noteId, currentFolderId) => {
    store.openMoveNoteDialog(noteId, currentFolderId)
}

const syncCurrentNoteFolder = (newFolderId) => {
    if (!note.value) return
    
    note.value.folder_id = newFolderId
    note.value.folderId = newFolderId
    
    const folderInfo = store.folders.find(folder => folder.id === newFolderId)
    if (folderInfo) {
        note.value.folder_name = folderInfo.name
        note.value.folderName = folderInfo.name
    }
}

const handleMoveNote = async (noteId, newFolderId) => {
    await store.moveNote(noteId, newFolderId)
    
    if (store.editorNoteCurrentFolderId === newFolderId) {
        syncCurrentNoteFolder(newFolderId)
    }
}

const handleDeleteNote = (noteId) => {
    store.deleteNote(noteId)
    // Go back to home page using router
    router.push({ name: 'home' })
}

const handleyoutube = ({ src }) => {
    if (!editor.value) {
        console.error('Editor not ready')
        return
    }
    
    editor.value
    .chain()
    .focus()
    .setYoutubeVideo({
        src,
        align: 'center',
    })
    .run()
}

const openyoutubeDialog = () => {
    embedYoutubeDialog.value = true
}

onMounted(async () => {
    editor.value = new Editor({
        extensions: [
        StarterKit,
        Subscript,
        Superscript,
        TaskList,
        TextStyle,
        Details.configure({
            persist: true,
            openClassName: DETAILS_OPEN_CLASS_NAME,
            HTMLAttributes: {
                class: 'tiptap-details',
            },
            renderToggleButton: renderDetailsToggleButton,
        }),
        DetailsSummary.configure({
            HTMLAttributes: {
                class: 'tiptap-details__summary',
            },
        }),
        DetailsContent.configure({
            HTMLAttributes: {
                class: 'tiptap-details__content',
            },
        }),
        Highlight.configure({
            multicolor: true,
        }),
        Placeholder.configure({
            // Use a placeholder:
            placeholder: 'Start writing or type "/" for commands',
        }),
        CodeBlockLowlight.configure({
            lowlight,
        }),
        TaskItem.configure({
            nested: true,
        }),
        Color.configure({
            types: ['textStyle', 'heading', 'paragraph'],
        }),
        Table.configure({
            resizable: true,
            renderWrapper: true,
        }),
        TableRow,
        TableHeader,
        TableCell,
        TableSlashCommand,
        FileHandler.configure({
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'],
            onDrop: (currentEditor, files, pos) => {
                currentEditor.chain().focus(pos).run()
                void insertImportedImages(files, pos)
            },
            onPaste: (currentEditor, files) => {
                currentEditor.chain().focus().run()
                void insertImportedImages(files)
            },
        }),
        ResizableImage,
        EmbeddedYoutube.configure({
            addPasteHandler: true,
            width: 640,
            height: 360,
            controls: true,
            nocookie: true,
            modestBranding: true,
        }),
        ],
    })
    
    await nextTick()
    await getNote(props.noteId)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener(IMAGE_MUTATION_EVENT, handleImageMutation)
    window.addEventListener(VIDEO_MUTATION_EVENT, handleVideoMutation)
    window.addEventListener(OPEN_YOUTUBE_DIALOG_EVENT, openyoutubeDialog)
})

watch(() => props.noteId, async (nextNoteId, previousNoteId) => {
    if (!nextNoteId || nextNoteId === previousNoteId) {
        return
    }
    
    await nextTick()
    await getNote(nextNoteId)
})

watch(() => store.editorNoteCurrentFolderId, (newFolderId) => {
    if (!note.value || store.editorNoteId !== note.value.id || !newFolderId) {
        return
    }
    
    syncCurrentNoteFolder(newFolderId)
})

watch(() => store.editorNoteFavorite, (newFavorite) => {
    if (!note.value || store.editorNoteId !== note.value.id || newFavorite === null) {
        return
    }
    
    note.value.favorite = newFavorite
})

watch(() => store.editorNoteTitle, (newTitle) => {
    if (!note.value || store.editorNoteId !== note.value.id || !newTitle) {
        return
    }
    
    note.value.title = newTitle
})

watch(() => store.editorNoteDeletedId, (deletedNoteId) => {
    if (!note.value || deletedNoteId !== note.value.id) {
        return
    }
    
    router.push({ name: 'home' })
})

onBeforeUnmount(() => {
    noteRequestId += 1
    if (editor.value) {
        editor.value.destroy()
    }
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener(IMAGE_MUTATION_EVENT, handleImageMutation)
    window.removeEventListener(VIDEO_MUTATION_EVENT, handleVideoMutation)
    window.removeEventListener(OPEN_YOUTUBE_DIALOG_EVENT, openyoutubeDialog)
})
</script>
