<template>
    <!-- Flex container to place button toggle and text field on the same line -->
    <div v-if="note" class="d-flex align-center">
        <div class="d-flex flex-column ml-4">
            <p class="text-h4">{{ note.title }}</p>
            <p class="text-subtitle-1 d-flex align-center">
                <v-icon size="small" class="mr-2">mdi-folder-outline</v-icon>
                {{ note.folderName }}
            </p>
        </div>
        
        <v-spacer></v-spacer>
        
        <v-btn-toggle divided class="ms-2 mr-4" :max="0" multiple variant="text">
            <v-tooltip text="Brainstorm with AI" location="top">
                <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" @click="brainstormWithAIDialog = !brainstormWithAIDialog">
                        <v-icon>mdi-lightbulb</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
            
            <v-tooltip :text="note.favorite === 1 ? 'Unfavorite' : 'Favorite'" location="top">
                <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" @click="toggleFavorite(note.id)">
                        <v-icon :icon="note.favorite === 1 ? 'mdi-heart-broken' : 'mdi-heart'"></v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
            <v-tooltip text="Rename" location="top">
                <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" @click="renameNoteDialog = true">
                        <v-icon>mdi-rename</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
            <v-tooltip text="Move" location="top">
                <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" @click="moveToFolderDialog = true">
                        <v-icon>mdi-file-move</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
            <v-tooltip text="Delete" location="top">
                <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" @click="store.openDeleteNoteConfirmationDialog(note.id)">
                        <v-icon>mdi-delete</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
        </v-btn-toggle>
    </div>
    
    <!-- Loader for the editor -->
    <v-container v-if="isLoading" class="ga-1">
        <v-progress-linear indeterminate color="primary"></v-progress-linear>
    </v-container>
    
    <div v-if="editor">
        <bubble-menu
        class="bubble-menu"
        :tippy-options="{
            duration: 100,
            zIndex: 10,
        }"
        :editor="editor"
        :style="{ backgroundColor: backgroudColor }"
        >
        
        <div class="d-flex flex-column rounded pa-2 elevation-4" :style="{ width: '465px', backgroundColor: backgroudColor }">
            <!-- First row with text formatting buttons -->
            <div class="d-flex flex-row align-center justify-center mb-2">
                <v-btn-toggle
                color="primary"
                multiple
                divided
                variant="text"
                >
                <!-- Bold -->
                <v-tooltip text="Bold (⌘B)" location="top">
                    <template v-slot:activator="{ props }">
                        <v-btn v-bind="props" @click="editor.chain().focus().toggleBold().run()">
                            <v-icon>mdi-format-bold</v-icon>
                        </v-btn>
                    </template>
                </v-tooltip>
                <!-- Italic -->
                <v-tooltip text="Italic (⌘I)" location="top">
                    <template v-slot:activator="{ props }">
                        <v-btn v-bind="props" @click="editor.chain().focus().toggleItalic().run()">
                            <v-icon>mdi-format-italic</v-icon>
                        </v-btn>
                    </template>
                </v-tooltip>
                <!-- Underline -->
                <v-tooltip text="Underline (⌘U)" location="top">
                    <template v-slot:activator="{ props }">
                        <v-btn v-bind="props" @click="editor.chain().focus().toggleUnderline().run()">
                            <v-icon>mdi-format-underline</v-icon>
                        </v-btn>
                    </template>
                </v-tooltip>
                <!-- Strike -->
                <v-tooltip text="Strike (⌘⇧S)" location="top">
                    <template v-slot:activator="{ props }">
                        <v-btn v-bind="props" @click="editor.chain().focus().toggleStrike().run()">
                            <v-icon>mdi-format-strikethrough</v-icon>
                        </v-btn>
                    </template>
                </v-tooltip>
                <!-- Superscript -->
                <v-tooltip text="Superscript (⌘.)" location="top">
                    <template v-slot:activator="{ props }">
                        <v-btn v-bind="props" @click="editor.chain().focus().toggleSuperscript().run()">
                            <v-icon>mdi-format-superscript</v-icon>
                        </v-btn>
                    </template>
                </v-tooltip>
                <!-- Subscript -->
                <v-tooltip text="Subscript (⌘,)" location="top">
                    <template v-slot:activator="{ props }">
                        <v-btn v-bind="props" @click="editor.chain().focus().toggleSubscript().run()">
                            <v-icon>mdi-format-subscript</v-icon>
                        </v-btn>
                    </template>
                </v-tooltip>
                <!-- Inline code -->
                <v-tooltip text="Inline code (⌘E)" location="top">
                    <template v-slot:activator="{ props }">
                        <v-btn v-bind="props" @click="editor.chain().focus().toggleCode().run()">
                            <v-icon>mdi-code-tags</v-icon>
                        </v-btn>
                    </template>
                </v-tooltip>
            </v-btn-toggle>
        </div>
        
        <!-- Divider between the two rows -->
        <v-divider class="ma-1"></v-divider>
        
        <!-- Second row with style and highlight dropdowns -->
        <div class="d-flex flex-row align-center justify-center mt-2">
            <v-menu>
                <template v-slot:activator="{ props }">
                    <v-btn
                    height="40px"
                    width="135px"
                    v-bind="props"
                    variant="text"
                    prepend-icon="mdi-chevron-down"
                    >
                    Style
                </v-btn>
            </template>
            <v-list density="compact">
                <v-list-subheader>Turn into</v-list-subheader>
                <!-- Paragraph -->
                <v-list-item @click="editor.commands.setParagraph()">
                    <template v-slot:prepend>
                        <v-icon icon="mdi-format-paragraph"></v-icon>
                    </template>
                    <v-list-item-title>Paragraph</v-list-item-title>
                </v-list-item>
                <!-- Heading 1 -->
                <v-list-item @click="editor.commands.toggleHeading({ level: 1 })">
                    <template v-slot:prepend>
                        <v-icon icon="mdi-format-header-1"></v-icon>
                    </template>
                    <v-list-item-title>Heading 1</v-list-item-title>
                </v-list-item>
                <!-- Heading 2 -->
                <v-list-item @click="editor.commands.toggleHeading({ level: 2 })">
                    <template v-slot:prepend>
                        <v-icon icon="mdi-format-header-2"></v-icon>
                    </template>
                    <v-list-item-title>Heading 2</v-list-item-title>
                </v-list-item>
                <!-- Heading 3 -->
                <v-list-item @click="editor.commands.toggleHeading({ level: 3 })">
                    <template v-slot:prepend>
                        <v-icon icon="mdi-format-header-3"></v-icon>
                    </template>
                    <v-list-item-title>Heading 3</v-list-item-title>
                </v-list-item>
                <!-- Bullet list -->
                <v-list-item @click="editor.commands.toggleBulletList()">
                    <template v-slot:prepend>
                        <v-icon icon="mdi-format-list-bulleted"></v-icon>
                    </template>
                    <v-list-item-title>Bullet list</v-list-item-title>
                </v-list-item>
                <!-- Numbered list -->
                <v-list-item @click="editor.commands.toggleOrderedList()">
                    <template v-slot:prepend>
                        <v-icon icon="mdi-format-list-numbered"></v-icon>
                    </template>
                    <v-list-item-title>Numbered list</v-list-item-title>
                </v-list-item>
                <!-- Task list -->
                <v-list-item @click="editor.commands.toggleTaskList()">
                    <template v-slot:prepend>
                        <v-icon icon="mdi-format-list-checkbox"></v-icon>
                    </template>
                    <v-list-item-title>Task list</v-list-item-title>
                </v-list-item>
                <!-- Blockquote -->
                <v-list-item @click="editor.commands.toggleBlockquote()">
                    <template v-slot:prepend>
                        <v-icon icon="mdi-format-quote-open"></v-icon>
                    </template>
                    <v-list-item-title>Quote</v-list-item-title>
                </v-list-item>
                <!-- Code block -->
                <v-list-item @click="editor.commands.toggleCodeBlock()">
                    <template v-slot:prepend>
                        <v-icon icon="mdi-code-tags"></v-icon>
                    </template>
                    <v-list-item-title>Code block</v-list-item-title>
                </v-list-item>
            </v-list>
        </v-menu>
        
        <v-divider vertical class="mx-2"></v-divider>
        
        <v-menu>
            <template v-slot:activator="{ props }">
                <v-btn
                height="40px"
                width="135px"
                v-bind="props"
                variant="text"
                prepend-icon="mdi-marker"
                >
                Highlight
            </v-btn>
        </template>
        <!-- Card with all color to highlight -->
        <v-card class="pa-2" max-width="340">
            <v-row dense>
                <v-col v-for="(color, index) in highlightColors" :key="index" cols="3">
                    <v-btn
                    :style="{ backgroundColor: color.value }"
                    class="color-btn ma-1"
                    variant="flat"
                    width="20px" 
                    height="40px"
                    @click="handleHighlight(color.value)"
                    >
                </v-btn>
            </v-col>
        </v-row>
    </v-card>
</v-menu>

<v-divider vertical class="mx-2"></v-divider>

<v-menu>
    <template v-slot:activator="{ props }">
        <v-btn
        height="40px"
        width="135px"
        v-bind="props"
        variant="text"
        prepend-icon="mdi-palette"
        >
        Color
    </v-btn>
</template>
<!-- Card with all color for the text -->
<v-card class="pa-2" max-width="340">
    <v-row dense>
        <v-col v-for="(color, index) in textColors" :key="index" cols="3">
            <v-btn
            :style="{ backgroundColor: color.value }"
            class="text-color-btn ma-1"
            variant="flat"
            width="20px" 
            height="40px"
            @click="handleTextColor(color.value)"
            >
        </v-btn>
    </v-col>
</v-row>
</v-card>
</v-menu>
</div>

<!-- Divider between the two rows -->
<v-divider class="ma-1 mt-2"></v-divider>

<!-- Third row with AI features -->
<div class="d-flex flex-row align-center justify-center mt-2">
    <!-- Ask AI -->
    <v-tooltip text="Ask AI to explain or edit" location="bottom">
        <template v-slot:activator="{ props }">
            <v-btn
            v-bind="props" @click="aiAsk()"
            variant="text"
            prepend-icon="mdi-forum"
            width="135px"
            height="40px"
            >
            Ask AI
        </v-btn>
    </template>
</v-tooltip>

<v-divider vertical class="mx-2"></v-divider>

<!-- Check grammar -->
<v-tooltip text="Fix spelling & grammar" location="bottom">
    <template v-slot:activator="{ props }">
        <v-btn
        v-bind="props" @click="aiFixGrammar()"
        variant="text"
        prepend-icon="mdi-spellcheck"
        width="135px"
        height="40px"
        >
        Check
    </v-btn>
</template>
</v-tooltip>

<v-divider vertical class="mx-2"></v-divider>

<v-menu>
    <template v-slot:activator="{ props }">
        <v-btn
        height="40px"
        width="135px"
        v-bind="props"
        variant="text"
        prepend-icon="mdi-chevron-down"
        >
        AI Tools
    </v-btn>
</template>
<v-list density="compact">
    <v-list-subheader>Edit</v-list-subheader>
    <v-list-item @click="aiFormatText()">
        <template v-slot:prepend>
            <v-icon icon="mdi-format-text"></v-icon>
        </template>
        <v-list-item-title>Format text</v-list-item-title>
    </v-list-item>
    <v-list-item @click="aiImproveWriting()">
        <template v-slot:prepend>
            <v-icon icon="mdi-auto-fix"></v-icon>
        </template>
        <v-list-item-title>Improve writing</v-list-item-title>
    </v-list-item>
    <v-list-item @click="aiMakeShorter()">
        <template v-slot:prepend>
            <v-icon icon="mdi-text-short"></v-icon>
        </template>
        <v-list-item-title>Summarize</v-list-item-title>
    </v-list-item>
    <v-list-item @click="aiMakeLonger()">
        <template v-slot:prepend>
            <v-icon icon="mdi-text-long"></v-icon>
        </template>
        <v-list-item-title>Expand</v-list-item-title>
    </v-list-item>
    <v-list-item @click="aiSimplify()">
        <template v-slot:prepend>
            <v-icon icon="mdi-cake-variant"></v-icon>
        </template>
        <v-list-item-title>Simplify language</v-list-item-title>
    </v-list-item>
    <v-list-subheader>Change tone</v-list-subheader>
    <v-menu open-on-hover location="end" offset="-10">
        <template v-slot:activator="{ props }">
            <v-list-item v-bind="props">
                <template v-slot:prepend>
                    <v-icon icon="mdi-tune-variant"></v-icon>
                </template>
                <template v-slot:append>
                    <v-icon icon="mdi-chevron-right"></v-icon>
                </template>
                <v-list-item-title>Change tone to</v-list-item-title>
            </v-list-item>
        </template>
        <v-list density="compact" style="min-width: 180px;">
            <v-list-item
            v-for="tone in supportedTones"
            :key="tone.key"
            @click="aiChangeTone(tone.key)"
            >
            <template v-slot:prepend>
                <v-icon :icon="tone.icon"></v-icon>
            </template>
            <v-list-item-title>{{ tone.label }}</v-list-item-title>
        </v-list-item>
    </v-list>
</v-menu>
<v-list-subheader>Translate</v-list-subheader>
<v-menu open-on-hover location="end" offset="-10">
    <template v-slot:activator="{ props }">
        <v-list-item v-bind="props">
            <template v-slot:prepend>
                <v-icon icon="mdi-translate"></v-icon>
            </template>
            <template v-slot:append>
                <v-icon icon="mdi-chevron-right"></v-icon>
            </template>
            <v-list-item-title>Translate to</v-list-item-title>
        </v-list-item>
    </template>
    <v-list density="compact" style="min-width: 160px;">
        <v-list-item
        v-for="lang in supportedLanguages"
        :key="lang.key"
        @click="aiTranslateTo(lang.key)"
        >
        <v-list-item-title>
            <span style="margin-right: 32px;">{{ lang.icon }}</span>{{ lang.label }}
        </v-list-item-title>
    </v-list-item>
</v-list>
</v-menu>
</v-list>
</v-menu>

</div>
</div>
</bubble-menu>
</div>

<!-- Floating menu -->
<!--
<floating-menu :editor="editor" :tippy-options="{ duration: 100 }" v-if="editor">
    <div class="floating-menu">
        <button @click="editor.chain().focus().toggleHeading({ level: 1 }).run()" :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }">
            H1
        </button>
        <button @click="editor.chain().focus().toggleHeading({ level: 2 }).run()" :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }">
            H2
        </button>
        <button @click="editor.chain().focus().toggleBulletList().run()" :class="{ 'is-active': editor.isActive('bulletList') }">
            Bullet list
        </button>
    </div>
</floating-menu> -->


<editor-content :editor="editor" v-model="content" class="ma-3"/>

<!-- Snackbar notification -->
<v-snackbar v-model="snackbarVisible" :timeout="snackbarDuration" bottom center :color="snackbarColor" variant="tonal">
    <div class="d-flex align-center">
        <v-icon icon="mdi-check-circle" class="me-2"></v-icon>
        {{ snackbarMessage }}
    </div>
    
    <template v-slot:actions>
        <v-btn
        variant="text"
        @click="snackbarVisible = false"
        >
        Close
    </v-btn>
</template>
</v-snackbar>

<div v-if="note">
    <RenameNoteDialog
    v-model="renameNoteDialog"
    :noteId="note.id"
    :currentNoteTitle="note.title"
    @rename-note="handleRenameNote"
    />
    
    <MoveToFolderDialog
    v-model="moveToFolderDialog"
    :noteId="note.id"
    :currentFolderId="note.folder_id"
    :currentFolderName="note.folderName"
    :folders="store.folders"
    @move-note="handleMoveNote"
    />
    
    <ConfirmDeleteNoteDialog
    v-model="deleteNoteDialog"
    :confirmationDialogTitle="confirmationDialogTitle"
    :confirmationDialogText="confirmationDialogText"
    :confirmationDialogButtonColor="confirmationDialogButtonColor"
    :noteId="note.id"
    @delete-note="handleDeleteNote"
    />
    
    <BrainstormWithAIDialog
    v-model="brainstormWithAIDialog"
    />
    
    <AskAIDialog
    v-model="askAIDialog"
    :selectedText="selectedText"
    />
</div>
</template>

<script setup>
import RenameNoteDialog from '../components/navbar/RenameNoteDialog.vue'
import MoveToFolderDialog from '../components/navbar/MoveToFolderDialog.vue'
import ConfirmDeleteNoteDialog from '../components/commons/ConfirmDeleteNoteDialog.vue'
import BrainstormWithAIDialog from '../components/editor/BrainstormWithAIDialog.vue'
import AskAIDialog from '../components/editor/AskAIDialog.vue'

import { createLlmService } from '../services/llmService';
import fixGrammarPrompt from '../prompts/fixGrammarPrompt'
import formatTextPrompt from '../prompts/formatTextPrompt';
import improveWritingPrompt from '../prompts/improveWritingPrompt'
import makeShorterPrompt from '../prompts/makeShorterPrompt'
import makeLongerPrompt from '../prompts/makeLongerPrompt'
import simplifyLanguagePrompt from '../prompts/simplifyLanguagePrompt';
import changeTonePrompt from '../prompts/changeTonePrompt';
import translateToPrompt from '../prompts/translateToPrompt';

import { useRouter } from 'vue-router'
import { useFoldersStore } from '../stores/foldersStore'
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import StarterKit from '@tiptap/starter-kit'
import {
    BubbleMenu,
    Editor,
    EditorContent,
    FloatingMenu,
} from '@tiptap/vue-3'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import Highlight from '@tiptap/extension-highlight'
import Blockquote from '@tiptap/extension-blockquote'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import { Color } from '@tiptap/extension-color'
import TextStyle from '@tiptap/extension-text-style'
import Table from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'

// Code block highlighting: load all languages with "all" and common languages with "common"
import { all, createLowlight } from 'lowlight'

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

// Init LLM services for AI features
const fixGrammarLLMService = createLlmService(fixGrammarPrompt, 'editorTools');
const formatTextLLMService = createLlmService(formatTextPrompt, 'editorTools');
const improveWritingLLMService = createLlmService(improveWritingPrompt, 'editorTools');
const makeShorterLLMService = createLlmService(makeShorterPrompt, 'editorTools');
const makeLongerLLMService = createLlmService(makeLongerPrompt, 'editorTools');
const simplifyLanguageLLMService = createLlmService(simplifyLanguagePrompt, 'editorTools');

// Init list with supported tones for change tone tool
const supportedTones = [
{ key: 'professional', icon: 'mdi-briefcase', label: 'Professional' },
{ key: 'friendly', icon: 'mdi-emoticon-happy', label: 'Friendly' },
{ key: 'empathetic', icon: 'mdi-handshake', label: 'Empathetic' },
{ key: 'persuasive', icon: 'mdi-creation', label: 'Persuasive' },
{ key: 'casual', icon: 'mdi-emoticon-cool', label: 'Casual' }
]

// Init list with supported languages for translation tool
const supportedLanguages = [
{ key: 'english', icon: '🇺🇸', label: 'English' },
{ key: 'italian', icon: '🇮🇹', label: 'Italian' },
{ key: 'spanish', icon: '🇪🇸', label: 'Spanish' },
{ key: 'french', icon: '🇫🇷', label: 'French' },
{ key: 'german', icon: '🇩🇪', label: 'German' },
{ key: 'portuguese', icon: '🇧🇷', label: 'Portuguese' },
]

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

// Snackbar reactive variables
const snackbarVisible = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('')
const snackbarDuration = ref(2000)

const brainstormWithAIDialog = ref(false)
const askAIDialog = ref(false)

const note = ref(null)
const selectedText = ref('')

const backgroudColor = computed(() => {
    return props.theme === 'dark' ? '#1c1c1c' : 'white'
})

// Create a lowlight instance
const lowlight = createLowlight(all)

const editor = ref(null)
const content = ref('')

const isLoading = ref(false)

const highlightColors = [
{ name: 'Default', value: 'default' },
{ name: 'Yellow', value: '#FFF8E1' },
{ name: 'Green', value: '#E0F2F1' },
{ name: 'Red', value: '#FFCDD2' },
{ name: 'Orange', value: '#FFF3E0' },
{ name: 'Blue', value: '#E8EAF6' },
{ name: 'Purple', value: '#F3E5F5' },
{ name: 'Pink', value: '#F3E5F5' },
]

const textColors = [
{ name: 'Default', value: '#212121' },
{ name: 'Red', value: '#F44336' },
{ name: 'Blue', value: '#3F51B5' },
{ name: 'Green', value: '#009688' },
{ name: 'Orange', value: '#FF9800' },
{ name: 'Yellow', value: '#FFC107' },
{ name: 'Purple', value: '#673AB7' },
{ name: 'Pink', value: '#E91E63' },
]

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
    
    if (colorValue === '#212121') {
        editor.value.chain().focus().unsetColor().run();
    } else {
        editor.value.chain().focus().setColor(colorValue).run();
    }
}

const getNote = async (id) => {
    // Get note from the database
    const noteInfo = await window.api.getNote(id)
    note.value = noteInfo
    
    // Get note folder from the database
    const folderInfo = await window.api.getFolder(noteInfo.folder_id)
    note.value.folderName = folderInfo.name
    
    if (note.value && editor.value && note.value.content_json != '{}') {
        editor.value.commands.setContent(note.value.content_json)
    }
}

const saveNoteManually = async () => {
    try {
        // Save the content
        await window.api.updateNote({ id: note.value.id, contentJson: editor.value.getJSON() })
        
        // Show snackbar notification
        snackbarMessage.value = `Note saved!`
        snackbarColor.value = ''
        snackbarVisible.value = true
    } catch (error) {
        const errorMsg = 'Failed to save note'
        console.error(errorMsg, error)
        
        // Show snackbar notification with error message
        snackbarMessage.value = errorMsg
        snackbarColor.value = 'error'
        snackbarVisible.value = true
    }
}

const handleKeyDown = (event) => {
    // For Mac, event.metaKey is Command; fallback to Ctrl for others
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        saveNoteManually()
    }
}

const handleRenameNote = (noteId, newTitle) => {
    note.value.title = newTitle
    store.renameNote(noteId, newTitle)
}

const toggleFavorite = async (noteId) => {
    store.toggleNoteFavorite(noteId)
    note.value.favorite = note.value.favorite === 0 ? 1 : 0
}

const handleMoveNote = (noteId, newFolderId) => {
    store.moveNote(noteId, newFolderId)
    
    // Update note's folder id and name
    note.value.folder_id = newFolderId
    const folderInfo = store.folders.find(folder => folder.id === newFolderId)
    if (folderInfo) {
        note.value.folderName = folderInfo.name
    }
}

const handleDeleteNote = (noteId) => {
    store.deleteNote(noteId)
    // Go back to home page using router
    router.push({ name: 'home' })
}

const aiAsk = () => {
    if (!editor.value) {
        console.error('Editor not ready');
        return;
    }
    
    const { state } = editor.value.view;
    const { from, to } = state.selection;
    if (from === to) {
        console.error('No text selected');
        return;
    }
    
    // Immediately hide bubble menu
    editor.value.commands.blur();
    
    // Get selected text
    selectedText.value = state.doc.textBetween(from, to, ' ');
    
    // Show AI dialog
    askAIDialog.value = true;
}

const aiFixGrammar = async () => {
    if (!editor.value) {
        console.error('Editor not ready');
        return;
    }
    
    const { state } = editor.value.view;
    const { from, to } = state.selection;
    if (from === to) {
        console.error('No text selected');
        return;
    }
    
    // Immediately hide bubble menu
    editor.value.commands.blur();
    
    // Turn on skeleton
    isLoading.value = true;
    
    try {
        const selectedText = state.doc.textBetween(from, to, ' ');
        
        let streamedText = '';
        let firstChunk = true;
        const stream = await fixGrammarLLMService.stream(selectedText);
        
        for await (const chunk of stream) {
            streamedText += chunk;
            if (firstChunk) {
                // Delete the range and insert the first chunk
                editor.value.chain().focus().deleteRange({ from, to }).insertContent(streamedText).run();
                firstChunk = false;
            } else {
                // Only append the new chunk
                editor.value.chain().focus().insertContent(chunk).run();
            }
        }
    } catch (error) {
        console.error('Failed to get response:', error);
    } finally {
        // Turn off skeleton
        isLoading.value = false;
    }
}

const aiFormatText = async () => {
    if (!editor.value) {
        console.error('Editor not ready');
        return;
    }
    
    const { state } = editor.value.view;
    const { from, to } = state.selection;
    if (from === to) {
        console.error('No text selected');
        return;
    }
    
    // Immediately hide bubble menu
    editor.value.commands.blur();
    
    // Turn on skeleton
    isLoading.value = true;
    
    try {
        const selectedText = state.doc.textBetween(from, to, ' ')
        
        const response = await formatTextLLMService.generate(selectedText);
        
        // Optional delay if needed to ensure bubble menu unmount
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Replace text
        editor.value.chain()
        .focus()
        .deleteRange({ from, to })
        .insertContent(response)
        .run();
    } catch (error) {
        console.error('Failed to get response:', error);
    } finally {
        // Turn off skeleton
        isLoading.value = false;
    }
}

const aiImproveWriting = async () => {
    if (!editor.value) {
        console.error('Editor not ready');
        return;
    }
    
    const { state } = editor.value.view;
    const { from, to } = state.selection;
    if (from === to) {
        console.error('No text selected');
        return;
    }
    
    // Immediately hide bubble menu
    editor.value.commands.blur();
    
    // Turn on skeleton
    isLoading.value = true;
    
    try {
        const selectedText = state.doc.textBetween(from, to, ' ');
        
        let streamedText = '';
        let firstChunk = true;
        const stream = await improveWritingLLMService.stream(selectedText);
        
        for await (const chunk of stream) {
            streamedText += chunk;
            if (firstChunk) {
                // Delete the range and insert the first chunk
                editor.value.chain().focus().deleteRange({ from, to }).insertContent(streamedText).run();
                firstChunk = false;
            } else {
                // Only append the new chunk
                editor.value.chain().focus().insertContent(chunk).run();
            }
        }
    } catch (error) {
        console.error('Failed to get response:', error);
    } finally {
        // Turn off skeleton
        isLoading.value = false;
    }
}

const aiMakeShorter = async () => {
    if (!editor.value) {
        console.error('Editor not ready');
        return;
    }
    
    const { state } = editor.value.view;
    const { from, to } = state.selection;
    if (from === to) {
        console.error('No text selected');
        return;
    }
    
    // Immediately hide bubble menu
    editor.value.commands.blur();
    
    // Turn on skeleton
    isLoading.value = true;
    
    try {
        const selectedText = state.doc.textBetween(from, to, ' ');
        
        let streamedText = '';
        let firstChunk = true;
        const stream = await makeShorterLLMService.stream(selectedText);
        
        for await (const chunk of stream) {
            streamedText += chunk;
            if (firstChunk) {
                // Delete the range and insert the first chunk
                editor.value.chain().focus().deleteRange({ from, to }).insertContent(streamedText).run();
                firstChunk = false;
            } else {
                // Only append the new chunk
                editor.value.chain().focus().insertContent(chunk).run();
            }
        }
    } catch (error) {
        console.error('Failed to get response:', error);
    } finally {
        // Turn off skeleton
        isLoading.value = false;
    }
}

const aiMakeLonger = async () => {
    if (!editor.value) {
        console.error('Editor not ready');
        return;
    }
    
    const { state } = editor.value.view;
    const { from, to } = state.selection;
    if (from === to) {
        console.error('No text selected');
        return;
    }
    
    // Immediately hide bubble menu
    editor.value.commands.blur();
    
    // Turn on skeleton
    isLoading.value = true;
    
    try {
        const selectedText = state.doc.textBetween(from, to, ' ');
        
        let streamedText = '';
        let firstChunk = true;
        const stream = await makeLongerLLMService.stream(selectedText);
        
        for await (const chunk of stream) {
            streamedText += chunk;
            if (firstChunk) {
                // Delete the range and insert the first chunk
                editor.value.chain().focus().deleteRange({ from, to }).insertContent(streamedText).run();
                firstChunk = false;
            } else {
                // Only append the new chunk
                editor.value.chain().focus().insertContent(chunk).run();
            }
        }
    } catch (error) {
        console.error('Failed to get response:', error);
    } finally {
        // Turn off skeleton
        isLoading.value = false;
    }
}

const aiSimplify = async () => {
    if (!editor.value) {
        console.error('Editor not ready');
        return;
    }
    
    const { state } = editor.value.view;
    const { from, to } = state.selection;
    if (from === to) {
        console.error('No text selected');
        return;
    }
    
    // Immediately hide bubble menu
    editor.value.commands.blur();
    
    // Turn on skeleton
    isLoading.value = true;
    
    try {
        const selectedText = state.doc.textBetween(from, to, ' ');
        
        let streamedText = '';
        let firstChunk = true;
        const stream = await simplifyLanguageLLMService.stream(selectedText);
        
        for await (const chunk of stream) {
            streamedText += chunk;
            if (firstChunk) {
                // Delete the range and insert the first chunk
                editor.value.chain().focus().deleteRange({ from, to }).insertContent(streamedText).run();
                firstChunk = false;
            } else {
                // Only append the new chunk
                editor.value.chain().focus().insertContent(chunk).run();
            }
        }
    } catch (error) {
        console.error('Failed to get response:', error);
    } finally {
        // Turn off skeleton
        isLoading.value = false;
    }
}

const aiChangeTone = async (tone) => {
    if (!editor.value) {
        console.error('Editor not ready');
        return;
    }
    
    const { state } = editor.value.view;
    const { from, to } = state.selection;
    if (from === to) {
        console.error('No text selected');
        return;
    }
    
    // Immediately hide bubble menu
    editor.value.commands.blur();
    
    // Turn on skeleton
    isLoading.value = true;
    
    try {
        // Create LLM service with the selected tone
        const changeToneLLMService = createLlmService(changeTonePrompt(tone), 'editorTools');
        
        const selectedText = state.doc.textBetween(from, to, ' ');
        
        let streamedText = '';
        let firstChunk = true;
        const stream = await changeToneLLMService.stream(selectedText);
        
        for await (const chunk of stream) {
            streamedText += chunk;
            if (firstChunk) {
                // Delete the range and insert the first chunk
                editor.value.chain().focus().deleteRange({ from, to }).insertContent(streamedText).run();
                firstChunk = false;
            } else {
                // Only append the new chunk
                editor.value.chain().focus().insertContent(chunk).run();
            }
        }
    } catch (error) {
        console.error('Failed to get response:', error);
    } finally {
        // Turn off skeleton
        isLoading.value = false;
    }
}

const aiTranslateTo = async (language) => {
    if (!editor.value) {
        console.error('Editor not ready');
        return;
    }
    
    const { state } = editor.value.view;
    const { from, to } = state.selection;
    if (from === to) {
        console.error('No text selected');
        return;
    }
    
    // Immediately hide bubble menu
    editor.value.commands.blur();
    
    // Turn on skeleton
    isLoading.value = true;
    
    try {
        // Create LLM service with the chosen language
        const translateToLLMService = createLlmService(translateToPrompt(language), 'editorTools');
        
        const selectedText = state.doc.textBetween(from, to, ' ');
        
        let streamedText = '';
        let firstChunk = true;
        const stream = await translateToLLMService.stream(selectedText);
        
        for await (const chunk of stream) {
            streamedText += chunk;
            if (firstChunk) {
                // Delete the range and insert the first chunk
                editor.value.chain().focus().deleteRange({ from, to }).insertContent(streamedText).run();
                firstChunk = false;
            } else {
                // Only append the new chunk
                editor.value.chain().focus().insertContent(chunk).run();
            }
        }
    } catch (error) {
        console.error('Failed to get response:', error);
    } finally {
        // Turn off skeleton
        isLoading.value = false;
    }
}

onMounted(() => {
    editor.value = new Editor({
        extensions: [
        StarterKit,
        Underline,
        Subscript,
        Superscript,
        Blockquote,
        BulletList,
        OrderedList,
        ListItem,
        TaskList,
        HorizontalRule,
        TextStyle,
        Highlight.configure({
            multicolor: true,
        }),
        Placeholder.configure({
            // Use a placeholder:
            placeholder: 'Write something here...',
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
        }),
        TableRow,
        TableHeader,
        TableCell,
        ],
    })
    
    getNote(props.noteId)
    window.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
    if (editor.value) {
        editor.value.destroy()
    }
    window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style>
.tiptap p.is-editor-empty:first-child::before {
    color: #adb5bd;
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
}

.ProseMirror {
    padding: 32px;
    border-radius: 8px;
    border: 1px solid #dbdbdb;
    height: calc(100vh - 220px);
    overflow-y: auto;
}

/* Remove the default outline when the editor is focused */
.ProseMirror:focus {
    outline: none;
}

.note-title {
    font-weight: bolder;
}

/* Highlight color style */
.color-btn {
    border-radius: 4px;
    box-shadow: inset 0px 0px 0px 1px rgba(0, 0, 0, 0.3);
}

.color-btn:hover {
    transform: scale(1.1);
    transition: transform 0.2s;
}

/* Text color style */
.text-color-btn {
    border-radius: 4px;
    box-shadow: inset 0px 0px 0px 1px rgba(0, 0, 0, 0.3);
}

.text-color-btn:hover {
    transform: scale(1.1);
    transition: transform 0.2s;
}

blockquote {
    border-left: 3px solid #757575;
    margin: 1.5rem 0;
    padding-left: 1rem;
}

/* List styles */
ul, ol {
    padding: 0 1rem;
    margin: 1.25rem 1rem 1.25rem 0.4rem;
    
    li p {
        margin-top: 0.25em;
        margin-bottom: 0.25em;
    }
}

/* Code block styles */
pre {
    background: #212121;
    border-radius: 0.5rem;
    color: white;
    font-family: 'JetBrainsMono', monospace;
    margin: 1.5rem 0;
    padding: 0.75rem 1rem;
    
    code {
        background: none;
        color: inherit;
        font-size: 0.8rem;
        padding: 0;
    }
    
    /* Code styling */
    .hljs-comment,
    .hljs-quote {
        color: #616161;
    }
    
    .hljs-variable,
    .hljs-template-variable,
    .hljs-attribute,
    .hljs-tag,
    .hljs-name,
    .hljs-regexp,
    .hljs-link,
    .hljs-name,
    .hljs-selector-id,
    .hljs-selector-class {
        color: #f98181;
    }
    
    .hljs-number,
    .hljs-meta,
    .hljs-built_in,
    .hljs-builtin-name,
    .hljs-literal,
    .hljs-type,
    .hljs-params {
        color: #fbbc88;
    }
    
    .hljs-string,
    .hljs-symbol,
    .hljs-bullet {
        color: #b9f18d;
    }
    
    .hljs-title,
    .hljs-section {
        color: #faf594;
    }
    
    .hljs-keyword,
    .hljs-selector-tag {
        color: #70cff8;
    }
    
    .hljs-emphasis {
        font-style: italic;
    }
    
    .hljs-strong {
        font-weight: 700;
    }
}

/* Task list specific styles */
ul[data-type="taskList"] {
    list-style: none;
    margin-left: 0;
    padding: 0;
    
    li {
        align-items: flex-start;
        display: flex;
        
        > label {
            flex: 0 0 auto;
            margin-right: 0.5rem;
            user-select: none;
        }
        
        > div {
            flex: 1 1 auto;
        }
    }
    
    input[type="checkbox"] {
        cursor: pointer;
        margin-top: 10px;
    }
    
    ul[data-type="taskList"] {
        margin: 0;
    }
}

/* Table styles */
/* Table-specific styling */
table {
    border-collapse: collapse;
    margin: 0;
    overflow: hidden;
    table-layout: fixed;
    width: 100%;
    
    td,
    th {
        border: 1px solid var(--gray-3);
        box-sizing: border-box;
        min-width: 1em;
        padding: 6px 8px;
        position: relative;
        vertical-align: top;
        
        > * {
            margin-bottom: 0;
        }
    }
    
    th {
        background-color: var(--gray-1);
        font-weight: bold;
        text-align: left;
    }
    
    .selectedCell:after {
        background: var(--gray-2);
        content: "";
        left: 0; right: 0; top: 0; bottom: 0;
        pointer-events: none;
        position: absolute;
        z-index: 2;
    }
    
    .column-resize-handle {
        background-color: var(--purple);
        bottom: -2px;
        pointer-events: none;
        position: absolute;
        right: -2px;
        top: 0;
        width: 4px;
    }
}

.tableWrapper {
    margin: 1.5rem 0;
    overflow-x: auto;
}

&.resize-cursor {
    cursor: ew-resize;
    cursor: col-resize;
}

/* Floating menu */
.floating-menu {
    display: flex;
    background-color: gray;
    padding: 0.1rem;
    border-radius: 0.5rem;
    
    button {
        background-color: unset;
        padding: 0.275rem 0.425rem;
        border-radius: 0.3rem;
        
        &:hover {
            background-color: gray;
        }
        
        &.is-active {
            background-color: white;
            color: purple;
            
            &:hover {
                color: darkmagenta;
            }
        }
    }
}
</style>