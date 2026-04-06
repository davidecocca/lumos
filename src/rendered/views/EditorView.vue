<template>
    <!-- Flex container to place button toggle and text field on the same line -->
    <div v-if="note" class="d-flex align-center">
        <div class="d-flex flex-column ml-4">
            <p class="text-headline-large font-weight-medium ma-0">{{ note.title }}</p>
            <div class="d-inline-flex mt-2">
                <v-chip
                color="primary"
                variant="tonal"
                >
                {{ currentFolderName }}
            </v-chip>
        </div>
    </div>
    
    <v-spacer></v-spacer>
    
    <div class="d-flex align-center">
        <v-btn-toggle divided class="ms-2" :max="0" multiple variant="text">
            <v-tooltip text="Undo" location="bottom">
                <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" @click="editor.chain().focus().undo().run()">
                        <v-icon>ph-arrow-counter-clockwise</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
            
            <v-tooltip text="Redo" location="bottom">
                <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" @click="editor.chain().focus().redo().run()">
                        <v-icon>ph-arrow-clockwise</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
            
            <v-tooltip text="Save" location="bottom">
                <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" @click="saveNoteManually">
                        <v-icon>ph-floppy-disk</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
            <v-tooltip text="More" location="bottom">
                <template v-slot:activator="{ props: tooltipProps }">
                    <v-menu>
                        <template v-slot:activator="{ props: menuProps }">
                            <v-btn v-bind="{ ...tooltipProps, ...menuProps }">
                                <v-icon>ph-dots-three</v-icon>
                            </v-btn>
                        </template>
                        <v-list density="compact">
                            <v-list-item @click="toggleFavorite(note.id)">
                                <template v-slot:prepend>
                                    <v-icon :icon="note.favorite === 1 ? 'ph-heart-break' : 'ph-heart'"></v-icon>
                                </template>
                                <v-list-item-title>{{ note.favorite === 1 ? 'Unfavorite' : 'Favorite' }}</v-list-item-title>
                            </v-list-item>
                            <v-list-item @click="renameNoteDialog = true">
                                <template v-slot:prepend>
                                    <v-icon>ph-pencil-line</v-icon>
                                </template>
                                <v-list-item-title>Rename</v-list-item-title>
                            </v-list-item>
                            <v-list-item @click="moveToFolderDialog = true">
                                <template v-slot:prepend>
                                    <v-icon>ph-export</v-icon>
                                </template>
                                <v-list-item-title>Move</v-list-item-title>
                            </v-list-item>
                            <v-list-item @click="store.openDeleteNoteConfirmationDialog(note.id)">
                                <template v-slot:prepend>
                                    <v-icon>ph-trash</v-icon>
                                </template>
                                <v-list-item-title>Delete</v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-menu>
                </template>
            </v-tooltip>
        </v-btn-toggle>
        
    </div>
</div>

<!-- AI quick functions -->
<div class="d-flex justify-left align-center pa-2 mt-2 ai-actions">
    <v-tooltip text="Generate with AI" location="bottom">
        <template v-slot:activator="{ props }">
            <v-btn v-bind="props" @click="generateWithAIDialog = !generateWithAIDialog" class="ma-2" variant="outlined" prepend-icon="ph-lightbulb" rounded="lg" :color="theme === 'dark' ? 'amber' : 'orange-darken-4'">Generate</v-btn>
        </template>
    </v-tooltip>
    <v-tooltip text="Edit with AI" location="bottom">
        <template v-slot:activator="{ props }">
            <v-btn v-bind="props" @click="aiEdit" class="ma-2" variant="outlined" prepend-icon="ph-pencil-simple" rounded="lg" color="primary">Edit</v-btn>
        </template>
    </v-tooltip>
    <v-tooltip text="Fix spelling & grammar" location="bottom">
        <template v-slot:activator="{ props }">
            <v-btn v-bind="props" @click="aiFixGrammar()" class="ma-2" variant="outlined" prepend-icon="ph-text-aa" rounded="lg" :color="theme === 'dark' ? 'teal-lighten-1' : 'teal-darken-4'">Fix</v-btn>
        </template>
    </v-tooltip>
    <v-tooltip text="Format text with AI" location="bottom">
        <template v-slot:activator="{ props }">
            <v-btn v-bind="props" @click="aiFormatText()" class="ma-2" variant="outlined" prepend-icon="ph-text-t" rounded="lg" :color="theme === 'dark' ? 'blue-grey-lighten-3' : 'blue-grey-darken-4'">Format</v-btn>
        </template>
    </v-tooltip>
    <v-menu>
        <template v-slot:activator="{ props }">
            <v-btn v-bind="props" class="ma-2" variant="outlined" prepend-icon="ph-caret-down" rounded="lg">Other</v-btn>
        </template>
        <v-list density="compact">
            <!-- Edit submenu (no Format here) -->
            <v-list-subheader>Edit</v-list-subheader>
            <v-list-item @click="aiImproveWriting()">
                <template v-slot:prepend>
                    <v-icon icon="ph-pencil-simple"></v-icon>
                </template>
                <v-list-item-title>Improve writing</v-list-item-title>
            </v-list-item>
            <v-list-item @click="aiMakeShorter()">
                <template v-slot:prepend>
                    <v-icon icon="ph-text-align-left"></v-icon>
                </template>
                <v-list-item-title>Summarize</v-list-item-title>
            </v-list-item>
            <v-list-item @click="aiMakeLonger()">
                <template v-slot:prepend>
                    <v-icon icon="ph-text-align-justify"></v-icon>
                </template>
                <v-list-item-title>Expand</v-list-item-title>
            </v-list-item>
            <v-list-item @click="aiSimplify()">
                <template v-slot:prepend>
                    <v-icon icon="ph-text-aa"></v-icon>
                </template>
                <v-list-item-title>Simplify language</v-list-item-title>
            </v-list-item>
            <!-- Tone submenu -->
            <v-list-subheader>Tone</v-list-subheader>
            <v-menu open-on-hover location="end" offset="-10">
                <template v-slot:activator="{ props }">
                    <v-list-item v-bind="props">
                        <template v-slot:prepend>
                            <v-icon icon="ph-sliders-horizontal"></v-icon>
                        </template>
                        <template v-slot:append>
                            <v-icon icon="ph-caret-right"></v-icon>
                        </template>
                        <v-list-item-title>Change tone to</v-list-item-title>
                    </v-list-item>
                </template>
                <v-list density="compact" style="min-width: 180px;">
                    <v-list-item v-for="tone in supportedTones" :key="tone.key" @click="aiChangeTone(tone.key)">
                        <template v-slot:prepend>
                            <v-icon :icon="tone.icon"></v-icon>
                        </template>
                        <v-list-item-title>{{ tone.label }}</v-list-item-title>
                    </v-list-item>
                </v-list>
            </v-menu>
            <!-- Translate submenu -->
            <v-list-subheader>Translate</v-list-subheader>
            <v-menu open-on-hover location="end" offset="-10">
                <template v-slot:activator="{ props }">
                    <v-list-item v-bind="props">
                        <template v-slot:prepend>
                            <v-icon icon="ph-translate"></v-icon>
                        </template>
                        <template v-slot:append>
                            <v-icon icon="ph-caret-right"></v-icon>
                        </template>
                        <v-list-item-title>Translate to</v-list-item-title>
                    </v-list-item>
                </template>
                <v-list density="compact" style="min-width: 160px;">
                    <v-list-item v-for="lang in supportedLanguages" :key="lang.key" @click="aiTranslateTo(lang.key)">
                        <v-list-item-title>
                            <span style="margin-right: 32px;">{{ lang.icon }}</span>{{ lang.label }}
                        </v-list-item-title>
                    </v-list-item>
                </v-list>
            </v-menu>
        </v-list>
    </v-menu>
</div>

<div v-if="editor">
    <bubble-menu
    class="bubble-menu"
    :should-show="shouldShowBubbleMenu"
    :append-to="getBubbleMenuAppendTarget"
    :options="{
        offset: 6,
        placement: 'top',
        strategy: 'fixed',
    }"
    :editor="editor"
    >
    
    <div class="d-flex flex-column rounded-lg pa-2 elevation-4" :style="{ width: '465px', backgroundColor: backgroundColor }">
        <!-- First row with text formatting buttons -->
        <div class="d-flex flex-row align-center justify-center mb-2">
            <v-btn-toggle
            color="primary"
            multiple
            divided
            variant="text"
            :max="0"
            >
            <!-- Bold -->
            <v-tooltip text="Bold (⌘B)" location="top">
                <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" @click="editor.chain().focus().toggleBold().run()">
                        <v-icon>ph-text-b</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
            <!-- Italic -->
            <v-tooltip text="Italic (⌘I)" location="top">
                <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" @click="editor.chain().focus().toggleItalic().run()">
                        <v-icon>ph-text-italic</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
            <!-- Underline -->
            <v-tooltip text="Underline (⌘U)" location="top">
                <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" @click="editor.chain().focus().toggleUnderline().run()">
                        <v-icon>ph-text-underline</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
            <!-- Strike -->
            <v-tooltip text="Strike (⌘⇧S)" location="top">
                <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" @click="editor.chain().focus().toggleStrike().run()">
                        <v-icon>ph-text-strikethrough</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
            <!-- Superscript -->
            <v-tooltip text="Superscript (⌘.)" location="top">
                <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" @click="editor.chain().focus().toggleSuperscript().run()">
                        <v-icon>ph-text-superscript</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
            <!-- Subscript -->
            <v-tooltip text="Subscript (⌘,)" location="top">
                <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" @click="editor.chain().focus().toggleSubscript().run()">
                        <v-icon>ph-text-subscript</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
            <!-- Inline code -->
            <v-tooltip text="Inline code (⌘E)" location="top">
                <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" @click="editor.chain().focus().toggleCode().run()">
                        <v-icon>ph-code</v-icon>
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
                prepend-icon="ph-caret-down"
                >
                Style
            </v-btn>
        </template>
        <v-list density="compact">
            <v-list-subheader>Turn into</v-list-subheader>
            <!-- Paragraph -->
            <v-list-item @click="editor.commands.setParagraph()">
                <template v-slot:prepend>
                    <v-icon icon="ph-paragraph"></v-icon>
                </template>
                <v-list-item-title>Paragraph</v-list-item-title>
            </v-list-item>
            <!-- Heading 1 -->
            <v-list-item @click="editor.commands.toggleHeading({ level: 1 })">
                <template v-slot:prepend>
                    <v-icon icon="ph-text-h-one"></v-icon>
                </template>
                <v-list-item-title>Heading 1</v-list-item-title>
            </v-list-item>
            <!-- Heading 2 -->
            <v-list-item @click="editor.commands.toggleHeading({ level: 2 })">
                <template v-slot:prepend>
                    <v-icon icon="ph-text-h-two"></v-icon>
                </template>
                <v-list-item-title>Heading 2</v-list-item-title>
            </v-list-item>
            <!-- Heading 3 -->
            <v-list-item @click="editor.commands.toggleHeading({ level: 3 })">
                <template v-slot:prepend>
                    <v-icon icon="ph-text-h-three"></v-icon>
                </template>
                <v-list-item-title>Heading 3</v-list-item-title>
            </v-list-item>
            <!-- Bullet list -->
            <v-list-item @click="editor.commands.toggleBulletList()">
                <template v-slot:prepend>
                    <v-icon icon="ph-list-bullets"></v-icon>
                </template>
                <v-list-item-title>Bullet list</v-list-item-title>
            </v-list-item>
            <!-- Numbered list -->
            <v-list-item @click="editor.commands.toggleOrderedList()">
                <template v-slot:prepend>
                    <v-icon icon="ph-list-numbers"></v-icon>
                </template>
                <v-list-item-title>Numbered list</v-list-item-title>
            </v-list-item>
            <!-- Task list -->
            <v-list-item @click="editor.commands.toggleTaskList()">
                <template v-slot:prepend>
                    <v-icon icon="ph-list-checks"></v-icon>
                </template>
                <v-list-item-title>Task list</v-list-item-title>
            </v-list-item>
            <!-- Blockquote -->
            <v-list-item @click="editor.commands.toggleBlockquote()">
                <template v-slot:prepend>
                    <v-icon icon="ph-quotes"></v-icon>
                </template>
                <v-list-item-title>Quote</v-list-item-title>
            </v-list-item>
            <!-- Code block -->
            <v-list-item @click="editor.commands.toggleCodeBlock()">
                <template v-slot:prepend>
                    <v-icon icon="ph-code"></v-icon>
                </template>
                <v-list-item-title>Code block</v-list-item-title>
            </v-list-item>
            <v-list-item @click="insertDetails()">
                <template v-slot:prepend>
                    <v-icon icon="ph-caret-right"></v-icon>
                </template>
                <v-list-item-title>Details</v-list-item-title>
            </v-list-item>
            <v-list-item v-if="canRemoveDetails()" @click="removeDetails()">
                <template v-slot:prepend>
                    <v-icon icon="ph-minus-circle"></v-icon>
                </template>
                <v-list-item-title>Remove details</v-list-item-title>
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
            prepend-icon="ph-highlighter"
            >
            Highlight
        </v-btn>
    </template>
    <!-- Card with all color to highlight -->
    <v-card class="pa-2 rounded-lg elevation-4" max-width="340" :style="{ backgroundColor: backgroundColor }">
        <v-row density="compact">
            <v-col v-for="(color, index) in highlightColors" :key="index" cols="3">
                <v-btn
                :style="{ backgroundColor: color.displayedColor }"
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
        prepend-icon="ph-palette"
        >
        Color
    </v-btn>
</template>
<!-- Card with all color for the text -->
<v-card class="pa-2 rounded-lg elevation-4" max-width="340" :style="{ backgroundColor: backgroundColor }">
    <v-row density="compact">
        <v-col v-for="(color, index) in textColors" :key="index" cols="3">
            <v-btn
            :style="{ backgroundColor: color.displayedColor }"
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
</div>
</bubble-menu>
</div>

<!-- Main content area with resizable layout -->
<div class="editor-layout">
    <!-- Left side - Editor content -->
    <div class="editor-content">
        <v-card 
        elevation="0"
        class="rounded-md border ma-3"
        rounded="lg"
        :loading="isLoading"
        >
        <v-card-text>
            <div ref="editorShellRef" class="editor-shell">
                <TableOverlayControls
                v-if="editor"
                :editor="editor"
                :container-ref="editorShellRef"
                />
                <editor-content :editor="editor"/>
            </div>
        </v-card-text>
    </v-card>
</div>

</div>

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
    
    <GenerateAIDialog
    v-model="generateWithAIDialog"
    />
    
    <EditAIDialog
    v-model="editWithAIDialog"
    :selectedText="selectedText"
    @apply="handleApply"
    />

    <EmbedYoutubeDialog
    v-model="embedYoutubeDialog"
    @embed="handleYoutubeEmbed"
    />
</div>
</template>

<script setup>
    import RenameNoteDialog from '../components/navbar/RenameNoteDialog.vue'
    import MoveToFolderDialog from '../components/navbar/MoveToFolderDialog.vue'
    import ConfirmDeleteNoteDialog from '../components/commons/ConfirmDeleteNoteDialog.vue'
    import GenerateAIDialog from '../components/editor/GenerateAIDialog.vue'
    import EditAIDialog from '../components/editor/EditAIDialog.vue'
    import EmbedYoutubeDialog from '../components/editor/EmbedYoutubeDialog.vue'
    import TableOverlayControls from '../components/editor/TableOverlayControls.vue'
    import TableSlashCommand, { OPEN_YOUTUBE_DIALOG_EVENT } from '../components/editor/tableSlashCommand'
    
    import { createLlmService } from '../services/llmService';
    import fixGrammarPrompt from '../prompts/fixGrammarPrompt'
    import formatTextPrompt from '../prompts/formatTextPrompt';
    import improveWritingPrompt from '../prompts/improveWritingPrompt'
    import makeShorterPrompt from '../prompts/makeShorterPrompt'
    import makeLongerPrompt from '../prompts/makeLongerPrompt'
    import simplifyLanguagePrompt from '../prompts/simplifyLanguagePrompt';
    import changeTonePrompt from '../prompts/changeTonePrompt';
    import translateToPrompt from '../prompts/translateToPrompt';
    import getTopicPrompt from '../prompts/getTopicPrompt';
    
    import { useRouter } from 'vue-router'
    import { useFoldersStore } from '../stores/foldersStore'
    import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue'
    import { isTextSelection } from '@tiptap/core'
    import StarterKit from '@tiptap/starter-kit'
    import {
        Editor,
        EditorContent,
    } from '@tiptap/vue-3'
    import { BubbleMenu } from '@tiptap/vue-3/menus'
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
    import Youtube from '../components/editor/youtubeEmbed'
    import ResizableImage from '../components/editor/resizableImage'
    
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
    
    // Init LLM services for AI features
    var fixGrammarLLMService = null
    var formatTextLLMService = null
    var improveWritingLLMService = null
    var makeShorterLLMService = null
    var makeLongerLLMService = null
    var simplifyLanguageLLMService = null
    var getTopicService = null
    try {
        fixGrammarLLMService = createLlmService(fixGrammarPrompt, 'editor');
        formatTextLLMService = createLlmService(formatTextPrompt, 'editor');
        improveWritingLLMService = createLlmService(improveWritingPrompt, 'editor');
        makeShorterLLMService = createLlmService(makeShorterPrompt, 'editor');
        makeLongerLLMService = createLlmService(makeLongerPrompt, 'editor');
        simplifyLanguageLLMService = createLlmService(simplifyLanguagePrompt, 'editor');
        getTopicService = createLlmService(getTopicPrompt, 'editor');
    } catch (error) {
        console.error('Error initializing LLM services:', error);
    }
    
    // Init list with supported tones for change tone tool
    const supportedTones = [
    { key: 'professional', icon: 'ph-briefcase', label: 'Professional' },
    { key: 'friendly', icon: 'ph-smiley', label: 'Friendly' },
    { key: 'empathetic', icon: 'ph-handshake', label: 'Empathetic' },
    { key: 'persuasive', icon: 'ph-sparkle', label: 'Persuasive' },
    { key: 'casual', icon: 'ph-smiley-wink', label: 'Casual' }
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
    
    const generateWithAIDialog = ref(false)
    const editWithAIDialog = ref(false)
    const embedYoutubeDialog = ref(false)
    
    const note = ref(null)
    const selectedText = ref('')
    const selectionFrom = ref(0)
    const selectionTo = ref(0)
    
    const backgroundColor = computed(() => {
        // Softer surfaces for menus consistent with app theme
        return props.theme === 'dark' ? '#212121' : '#ffffff'
    })

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
    const editorShellRef = ref(null)
    let noteRequestId = 0
    
    const isLoading = ref(false)
    
    const highlightColors = [
    { name: 'Default', value: 'default', displayedColor: 'default'},
    { name: 'Cyan', value: '#4477bb', displayedColor: '#4477bb' },
    { name: 'Yellow', value: '#aa6600', displayedColor: '#aa6600' },
    { name: 'Green', value: '#008811', displayedColor: '#008811' },
    { name: 'Red', value: '#dd3311', displayedColor: '#dd3311' },
    { name: 'Magenta', value: '#8866bb', displayedColor: '#8866bb' },
    { name: 'Blue', value: '#5566ee', displayedColor: '#5566ee' },
    { name: 'Purple', value: '#cc22bb', displayedColor: '#cc22bb' },
    ]
    
    const textColors = [
    { name: 'Default', value: '#212121', displayedColor: props.theme === 'dark' ? '#E0E0E0' : '#212121' },
    { name: 'Red', value: '#F44336', displayedColor: '#F44336' },
    { name: 'Blue', value: '#3F51B5', displayedColor: '#3F51B5' },
    { name: 'Green', value: '#009688', displayedColor: '#009688' },
    { name: 'Orange', value: '#FF9800', displayedColor: '#FF9800' },
    { name: 'Yellow', value: '#FFC107', displayedColor: '#FFC107' },
    { name: 'Purple', value: '#673AB7', displayedColor: '#673AB7' },
    { name: 'Pink', value: '#E91E63', displayedColor: '#E91E63' },
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
            note.value.folder_name = folderInfo.name
        }
    }
    
    const handleDeleteNote = (noteId) => {
        store.deleteNote(noteId)
        // Go back to home page using router
        router.push({ name: 'home' })
    }
    
    const aiEdit = () => {
        if (!editor.value) {
            console.error('Editor not ready');
            return;
        }
        
        const { state } = editor.value.view;
        const { from, to } = state.selection;
        
        selectionFrom.value = from;
        selectionTo.value = to;
        
        // Get selected text
        if (from === to) {
            // No text selected, use all content
            selectedText.value = state.doc.textContent;
        } else {
            // Use the selected text
            selectedText.value = state.doc.textBetween(from, to, '\n');
        }
        
        // Show Edit with AI dialog
        editWithAIDialog.value = true;
    }
    
    const handleApply = (aiText) => {
        if (!editor.value) {
            console.error('Editor not ready');
            return;
        }
        
        editor.value.chain().focus().setTextSelection({ from: selectionFrom.value, to: selectionTo.value }).insertContent(aiText).run();
    }

    const handleYoutubeEmbed = ({ src }) => {
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
                width: 640,
                height: 360,
            })
            .run()
    }

    const openYoutubeEmbedDialog = () => {
        embedYoutubeDialog.value = true
    }
    
    const aiFixGrammar = async () => {
        if (!editor.value) {
            console.error('Editor not ready');
            return;
        }
        
        // Immediately hide bubble menu
        editor.value.commands.blur();
        
        // Turn on skeleton
        isLoading.value = true;
        
        try {
            const { state } = editor.value.view;
            const { from, to } = state.selection;
            
            let selectedText = '';
            let isTextSelected = false;
            if (from === to) {
                // No text selected, use all content
                selectedText = state.doc.textContent;
            } else {
                // Use the selected text
                selectedText = state.doc.textBetween(from, to, ' ');
                isTextSelected = true;
            }
            
            let streamedText = '';
            let firstChunk = true;
            const stream = await fixGrammarLLMService.stream(selectedText);
            
            for await (const chunk of stream) {
                streamedText += chunk;
                if (firstChunk) {
                    if (isTextSelected) {
                        // Delete the range and insert the first chunk
                        editor.value
                        .chain()
                        .focus()
                        .deleteRange({ from, to })
                        .insertContent(streamedText)
                        .run();
                    }
                    else {
                        // Delete the entire note content insert the first chunk
                        editor.value
                        .chain()
                        .focus()
                        .deleteRange({ from: 0, to: state.doc.content.size })
                        .insertContent(streamedText)
                        .run();
                    }
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
        
        // Immediately hide bubble menu
        editor.value.commands.blur();
        
        // Turn on skeleton
        isLoading.value = true;
        
        try {
            const { state } = editor.value.view;
            const { from, to } = state.selection;
            
            let selectedText = '';
            let isTextSelected = false;
            if (from === to) {
                // No text selected, use all content
                selectedText = state.doc.textContent;
            } else {
                // Use the selected text
                selectedText = state.doc.textBetween(from, to, ' ');
                isTextSelected = true;
            }
            
            const response = await formatTextLLMService.generate(selectedText);
            
            // Optional delay if needed to ensure bubble menu unmount
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Replace the selected text
            if (isTextSelected) {
                editor.value
                .chain()
                .focus()
                .deleteRange({ from, to })
                .insertContent(response)
                .run();
            }
            // Or replace the entire note content
            else {
                editor.value
                .chain()
                .focus()
                .deleteRange({ from: 0, to: state.doc.content.size })
                .insertContent(response)
                .run();
            }
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
        // Immediately hide bubble menu
        editor.value.commands.blur();
        isLoading.value = true;
        try {
            let text = '';
            let isTextSelected = false;
            if (from === to) {
                text = state.doc.textContent;
            } else {
                text = state.doc.textBetween(from, to, ' ');
                isTextSelected = true;
            }
            let streamedText = '';
            let firstChunk = true;
            const stream = await improveWritingLLMService.stream(text);
            for await (const chunk of stream) {
                streamedText += chunk;
                if (firstChunk) {
                    if (isTextSelected) {
                        editor.value.chain().focus().deleteRange({ from, to }).insertContent(streamedText).run();
                    } else {
                        editor.value.chain().focus().deleteRange({ from: 0, to: state.doc.content.size }).insertContent(streamedText).run();
                    }
                    firstChunk = false;
                } else {
                    editor.value.chain().focus().insertContent(chunk).run();
                }
            }
        } catch (error) {
            console.error('Failed to get response:', error);
        } finally {
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
        editor.value.commands.blur();
        isLoading.value = true;
        try {
            let text = '';
            let isTextSelected = false;
            if (from === to) {
                text = state.doc.textContent;
            } else {
                text = state.doc.textBetween(from, to, ' ');
                isTextSelected = true;
            }
            let streamedText = '';
            let firstChunk = true;
            const stream = await makeShorterLLMService.stream(text);
            for await (const chunk of stream) {
                streamedText += chunk;
                if (firstChunk) {
                    if (isTextSelected) {
                        editor.value.chain().focus().deleteRange({ from, to }).insertContent(streamedText).run();
                    } else {
                        editor.value.chain().focus().deleteRange({ from: 0, to: state.doc.content.size }).insertContent(streamedText).run();
                    }
                    firstChunk = false;
                } else {
                    editor.value.chain().focus().insertContent(chunk).run();
                }
            }
        } catch (error) {
            console.error('Failed to get response:', error);
        } finally {
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
        editor.value.commands.blur();
        isLoading.value = true;
        try {
            let text = '';
            let isTextSelected = false;
            if (from === to) {
                text = state.doc.textContent;
            } else {
                text = state.doc.textBetween(from, to, ' ');
                isTextSelected = true;
            }
            let streamedText = '';
            let firstChunk = true;
            const stream = await makeLongerLLMService.stream(text);
            for await (const chunk of stream) {
                streamedText += chunk;
                if (firstChunk) {
                    if (isTextSelected) {
                        editor.value.chain().focus().deleteRange({ from, to }).insertContent(streamedText).run();
                    } else {
                        editor.value.chain().focus().deleteRange({ from: 0, to: state.doc.content.size }).insertContent(streamedText).run();
                    }
                    firstChunk = false;
                } else {
                    editor.value.chain().focus().insertContent(chunk).run();
                }
            }
        } catch (error) {
            console.error('Failed to get response:', error);
        } finally {
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
        editor.value.commands.blur();
        isLoading.value = true;
        try {
            let text = '';
            let isTextSelected = false;
            if (from === to) {
                text = state.doc.textContent;
            } else {
                text = state.doc.textBetween(from, to, ' ');
                isTextSelected = true;
            }
            let streamedText = '';
            let firstChunk = true;
            const stream = await simplifyLanguageLLMService.stream(text);
            for await (const chunk of stream) {
                streamedText += chunk;
                if (firstChunk) {
                    if (isTextSelected) {
                        editor.value.chain().focus().deleteRange({ from, to }).insertContent(streamedText).run();
                    } else {
                        editor.value.chain().focus().deleteRange({ from: 0, to: state.doc.content.size }).insertContent(streamedText).run();
                    }
                    firstChunk = false;
                } else {
                    editor.value.chain().focus().insertContent(chunk).run();
                }
            }
        } catch (error) {
            console.error('Failed to get response:', error);
        } finally {
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
        editor.value.commands.blur();
        isLoading.value = true;
        try {
            // Create LLM service with the selected tone
            const changeToneLLMService = createLlmService(changeTonePrompt(tone), 'editor');
            let text = '';
            let isTextSelected = false;
            if (from === to) {
                text = state.doc.textContent;
            } else {
                text = state.doc.textBetween(from, to, ' ');
                isTextSelected = true;
            }
            let streamedText = '';
            let firstChunk = true;
            const stream = await changeToneLLMService.stream(text);
            for await (const chunk of stream) {
                streamedText += chunk;
                if (firstChunk) {
                    if (isTextSelected) {
                        editor.value.chain().focus().deleteRange({ from, to }).insertContent(streamedText).run();
                    } else {
                        editor.value.chain().focus().deleteRange({ from: 0, to: state.doc.content.size }).insertContent(streamedText).run();
                    }
                    firstChunk = false;
                } else {
                    editor.value.chain().focus().insertContent(chunk).run();
                }
            }
        } catch (error) {
            console.error('Failed to get response:', error);
        } finally {
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
        editor.value.commands.blur();
        isLoading.value = true;
        try {
            // Create LLM service with the chosen language
            const translateToLLMService = createLlmService(translateToPrompt(language), 'editor');
            let text = '';
            let isTextSelected = false;
            if (from === to) {
                text = state.doc.textContent;
            } else {
                text = state.doc.textBetween(from, to, ' ');
                isTextSelected = true;
            }
            let streamedText = '';
            let firstChunk = true;
            const stream = await translateToLLMService.stream(text);
            for await (const chunk of stream) {
                streamedText += chunk;
                if (firstChunk) {
                    if (isTextSelected) {
                        editor.value.chain().focus().deleteRange({ from, to }).insertContent(streamedText).run();
                    } else {
                        editor.value.chain().focus().deleteRange({ from: 0, to: state.doc.content.size }).insertContent(streamedText).run();
                    }
                    firstChunk = false;
                } else {
                    editor.value.chain().focus().insertContent(chunk).run();
                }
            }
        } catch (error) {
            console.error('Failed to get response:', error);
        } finally {
            isLoading.value = false;
        }
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
            Youtube.configure({
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
        window.addEventListener(OPEN_YOUTUBE_DIALOG_EVENT, openYoutubeEmbedDialog)
    })

    watch(() => props.noteId, async (nextNoteId, previousNoteId) => {
        if (!nextNoteId || nextNoteId === previousNoteId) {
            return
        }

        await nextTick()
        await getNote(nextNoteId)
    })
    
    onBeforeUnmount(() => {
        noteRequestId += 1
        if (editor.value) {
            editor.value.destroy()
        }
        window.removeEventListener('keydown', handleKeyDown)
        window.removeEventListener(IMAGE_MUTATION_EVENT, handleImageMutation)
        window.removeEventListener(VIDEO_MUTATION_EVENT, handleVideoMutation)
        window.removeEventListener(OPEN_YOUTUBE_DIALOG_EVENT, openYoutubeEmbedDialog)
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
        padding: 16px 36px;
        height: calc(100vh - 300px);
        overflow-y: auto;
    }

    .editor-shell {
        position: relative;
    }

    .bubble-menu {
        z-index: 1500;
    }

    .ProseMirror .iframe-wrapper,
    .ProseMirror iframe {
        max-width: 100%;
    }

    .ProseMirror .iframe-wrapper {
        margin: 1rem 0;
    }

    .ProseMirror iframe {
        display: block;
        border: 0;
        border-radius: 12px;
        width: min(100%, 640px);
        aspect-ratio: 16 / 9;
        height: auto;
    }

    .ProseMirror .tiptap-details {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        column-gap: 0.75rem;
        align-items: start;
        margin: 1rem 0;
        padding: 0.9rem 1rem;
        border: 1px solid rgba(98, 108, 125, 0.22);
        border-radius: 14px;
        background: transparent;
    }

    .ProseMirror .tiptap-details > div {
        display: grid;
        min-width: 0;
        row-gap: 0.7rem;
    }

    .ProseMirror .tiptap-details__toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        padding: 0;
        margin-top: 0;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font-size: 0.95rem;
        line-height: 1;
    }

    .ProseMirror .tiptap-details__toggle:hover {
        background: rgba(98, 108, 125, 0.14);
    }

    .ProseMirror .tiptap-details__toggle:focus-visible {
        outline: 2px solid rgb(var(--v-theme-primary));
        outline-offset: 2px;
    }

    .ProseMirror .tiptap-details__summary {
        display: flex;
        align-items: center;
        min-height: 28px;
        margin: 0;
        font-weight: 600;
        line-height: 1.35;
        list-style: none;
    }

    .ProseMirror .tiptap-details__summary::marker,
    .ProseMirror .tiptap-details__summary::-webkit-details-marker {
        display: none;
    }

    .ProseMirror .tiptap-details__content {
        margin-top: 0;
        padding-top: 0.7rem;
    }

    .ProseMirror .tiptap-details .tiptap-details {
        margin: 0.2rem 0;
        background: transparent;
    }

    .ProseMirror .tiptap-details__content > :first-child {
        margin-top: 0;
    }

    .ProseMirror .tiptap-details__content > :last-child {
        margin-bottom: 0;
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
    
    /* AI actions responsive container */
    .ai-actions {
        flex-wrap: wrap;
        overflow-x: auto;
    }
    .ai-actions .v-btn {
        flex: 0 0 auto;
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
    .ProseMirror .tableWrapper {
        margin: 1.5rem 0;
        overflow-x: auto;
        border-radius: 12px;
        border: 1px solid rgba(33, 33, 33, 0.16);
        background-color: #ffffff;
    }

    .ProseMirror table {
        border-collapse: collapse;
        margin: 0;
        table-layout: fixed;
        width: 100%;
        background-color: #ffffff;
    }

    .ProseMirror table td,
    .ProseMirror table th {
        border: 1px solid rgba(33, 33, 33, 0.16);
        box-sizing: border-box;
        min-width: 1em;
        padding: 10px 12px;
        position: relative;
        vertical-align: top;
        background-color: transparent;
    }

    .ProseMirror table td > *,
    .ProseMirror table th > * {
        margin-bottom: 0;
    }

    .ProseMirror table th {
        background-color: #f5f5f5;
        font-weight: 600;
        text-align: left;
    }

    .v-theme--dark .ProseMirror .tableWrapper {
        border-color: rgba(255, 255, 255, 0.16);
        background-color: #1f1f1f;
    }

    .v-theme--dark .ProseMirror table {
        background-color: #1f1f1f;
    }

    .v-theme--dark .ProseMirror table td,
    .v-theme--dark .ProseMirror table th {
        border-color: rgba(255, 255, 255, 0.16);
        background-color: transparent;
    }

    .v-theme--dark .ProseMirror table th {
        background-color: #2a2a2a;
    }

    .ProseMirror table .selectedCell::after {
        background: rgba(33, 150, 243, 0.12);
        content: "";
        inset: 0;
        pointer-events: none;
        position: absolute;
        z-index: 2;
    }

    .v-theme--dark .ProseMirror table .selectedCell::after {
        background: rgba(144, 202, 249, 0.12);
    }

    .ProseMirror table .column-resize-handle {
        background-color: rgb(var(--v-theme-primary));
        bottom: -2px;
        pointer-events: none;
        position: absolute;
        right: -2px;
        top: 0;
        width: 4px;
    }

    .resize-cursor {
        cursor: col-resize;
    }
    
    /* Editor layout styles */
    .editor-layout {
        display: flex;
        height: calc(100vh - 240px); /* Adjust based on your header height */
        position: relative;
    }
    
    .editor-content {
        flex: 1;
        transition: width 0.3s ease;
        overflow: hidden;
    }
    
    .resize-divider {
        width: 4px;
        height: calc(100vh - 300px + 32px);
        margin: 12px 0;
        background-color: #e0e0e0;
        cursor: ew-resize;
        position: relative;
        flex-shrink: 0;
        align-self: flex-start;
    }
    
    .resize-divider:hover {
        background-color: #2196f3;
    }
    
    .resize-divider::after {
        content: '';
        position: absolute;
        top: 0;
        left: -2px;
        right: -2px;
        bottom: 0;
        background: transparent;
    }
    
    .sidebar-container {
        flex-shrink: 0;
        height: 100%;
        overflow: hidden;
    }
    
    /* Dark theme support for resize divider */
    [data-theme="dark"] .resize-divider {
        background-color: #424242;
    }
    
    [data-theme="dark"] .resize-divider:hover {
        background-color: #2196f3;
    }
</style>
