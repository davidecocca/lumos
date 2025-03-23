<template>
    <v-breadcrumbs :items="['Personal', 'New note']" class="ma-3 pa-0">
        <template v-slot:prepend>
            <v-icon icon="mdi-folder-outline" size="small" class="mb-1"></v-icon>
        </template>
        
    </v-breadcrumbs>
    
    <!-- Flex container to place button toggle and text field on the same line -->
    <div class="d-flex align-bottom mb-2 ml-4 mr-4">
        <v-text-field 
        placeholder="New note" 
        variant="underlined" 
        prepend-inner-icon="mdi-format-title"
        class="flex-grow-1 mr-2 note-title"
        ></v-text-field>
        
        <v-btn-toggle divided class="ms-2">
            <v-tooltip text="Generate with AI" location="top">
                <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" @click="generateWithAI()">
                        <v-icon>mdi-lightning-bolt</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
            
            <v-tooltip text="Add to favorites" location="top">
                <template v-slot:activator="{ props }">
                    <v-btn v-bind="props">
                        <v-icon>mdi-heart</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
            <v-tooltip text="Move to" location="top">
                <template v-slot:activator="{ props }">
                    <v-btn v-bind="props">
                        <v-icon>mdi-file-move</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
            <v-tooltip text="Delete" location="top">
                <template v-slot:activator="{ props }">
                    <v-btn v-bind="props">
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
        :tippy-options="{ duration: 100 }"
        :editor="editor"
        :style="{ backgroundColor: backgroudColor }"
        >
        
        <div class="d-flex flex-column rounded pa-2 elevation-4" :style="{ width: '460px', backgroundColor: backgroudColor }">
            <!-- First row with text formatting buttons -->
            <div class="d-flex flex-row align-center mb-2">
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
        <div class="d-flex flex-row align-center mt-2">
            <v-menu>
                <template v-slot:activator="{ props }">
                    <v-btn
                    height="40px"
                    width="119px"
                    v-bind="props"
                    variant="text"
                    append-icon="mdi-chevron-down"
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
                width="175px"
                v-bind="props"
                variant="text"
                append-icon="mdi-marker"
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
        width="118px"
        v-bind="props"
        variant="text"
        append-icon="mdi-palette"
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
<div class="d-flex flex-row align-center mt-2">
    <!-- Improve -->
    <v-tooltip text="Improve writing" location="bottom">
        <template v-slot:activator="{ props }">
            <v-btn
            v-bind="props" @click="aiImproveWriting()"
            variant="text"
            prepend-icon="mdi-magic-staff"
            >
            Fix
        </v-btn>
    </template>
</v-tooltip>

<v-divider vertical class="mx-2"></v-divider>

<!-- Summarize -->
<v-tooltip text="Make shorter" location="bottom">
    <template v-slot:activator="{ props }">
        <v-btn
        v-bind="props" @click="aiMakeShorter()"
        variant="text"
        prepend-icon="mdi-text-short"
        >
        TL;DR
    </v-btn>
</template>
</v-tooltip>

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
</floating-menu>
-->

<editor-content :editor="editor" v-model="content" class="ma-3"/>

</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
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

// Load all languages with "all" or common languages with "common"
import { all, createLowlight } from 'lowlight'

import { llmService } from '../services/llmService';
import { createLlmService } from '../services/llmService';

import improveWritingPrompt from '../prompts/improveWritingPrompt'
const improveWritingLlmService = createLlmService(improveWritingPrompt);

import makeShorterPrompt from '../prompts/makeShorterPrompt'
const makeShorterLlmService = createLlmService(makeShorterPrompt);

const props = defineProps({
    theme: {
        type: String,
        default: 'light',
    }
})

const backgroudColor = computed(
() => {
    return props.theme === 'dark' ? 'black' : 'white'
}
)

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

const generateWithAI = async () => {
    try {
        const userMessage = "Generate a simple hello message";
        const response = await llmService.sendMessage(userMessage);
        
        // Display the response in your view
        editor.value.chain().focus().insertContent(response).run();
    } catch (error) {
        console.error('Failed to get response:', error);
        // Show error to user
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
        const selectedText = editor.value.getText(from, to);
        const response = await improveWritingLlmService.sendMessage(selectedText);
        
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
        const selectedText = editor.value.getText(from, to);
        const response = await makeShorterLlmService.sendMessage(selectedText);
        
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
})

onBeforeUnmount(() => {
    if (editor.value) {
        editor.value.destroy()
    }
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
    /* background-color: #FAFAFA; */
    border: 1px solid #dbdbdb;
    height: calc(100vh - 200px);
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