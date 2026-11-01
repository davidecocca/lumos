<template>
    <div
        class="kanban-description-editor border rounded-lg"
        :class="{
            'd-flex flex-column kanban-description-editor--fill': fillSpace,
        }"
    >
        <!-- Editor toolbar -->
        <div
            class="d-flex align-center flex-wrap flex-shrink-0 ga-1 px-2 py-1 border-b"
        >
            <v-btn
                v-for="item in toolbarItems"
                :key="item.name"
                :icon="item.icon"
                variant="text"
                size="small"
                density="comfortable"
                rounded="lg"
                :active="editor?.isActive(item.name, item.attributes)"
                :disabled="disabled || (item.name === 'link' && editor?.isActive('code'))"
                :aria-label="item.label"
                @click="item.action"
            />
        </div>

        <!-- Editor content -->
        <EditorContent
            :editor="editor"
            class="kanban-description-editor__body"
            :class="{
                'd-flex flex-column flex-1-1 overflow-y-auto': fillSpace,
            }"
        />

        <!-- Link dialog -->
        <AddLinkDialog
            v-model="linkDialog"
            v-model:url="linkUrl"
            :editing="editingLink"
            :disabled="disabled"
            :error="linkError"
            @apply="applyLink"
            @remove="removeLink"
        />
    </div>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue';
import { Editor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import Underline from '@tiptap/extension-underline';
import { createEmptyDescription } from './utils/cards.js';
import AddLinkDialog from './dialogs/AddLinkDialog.vue';

const description = defineModel({ type: Object, required: true });
const props = defineProps({ disabled: Boolean, fillSpace: Boolean });
let applyingExternalContent = false;
const linkDialog = ref(false);
const linkUrl = ref('');
const linkError = ref('');
const editingLink = ref(false);
let linkSelection;
const editor = new Editor({
    content: description.value || createEmptyDescription(),
    extensions: [
        StarterKit.configure({
            blockquote: false,
            codeBlock: false,
            heading: { levels: [3] },
            horizontalRule: false,
            underline: false,
            link: {
                openOnClick: false,
                defaultProtocol: 'https',
                isAllowedUri: (url) => /^(https?:\/\/|mailto:)/i.test(url),
            },
        }),
        Underline,
        TaskList,
        TaskItem.configure({ nested: false }),
    ],
    editorProps: {
        handleClick: (view, _position, event) => {
            if (event.button !== 0) return false;
            const link = event.target?.closest?.('a[href]');
            if (!link || !view.dom.contains(link)) return false;
            event.preventDefault();
            void window.api.openExternalUrl(link.href).catch((error) => {
                console.error('Could not open link:', error);
            });
            return true;
        },
        attributes: {
            class: 'kanban-description-editor__content py-3 px-4',
            'aria-label': 'Description',
        },
    },
    onUpdate: ({ editor }) => {
        if (!applyingExternalContent) description.value = editor.getJSON();
    },
});

const toolbarItems = [
    {
        name: 'heading',
        icon: 'ph-text-h-three',
        label: 'Heading',
        attributes: { level: 3 },
        action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
        name: 'bold',
        icon: 'ph-text-b',
        label: 'Bold',
        action: () => editor.chain().focus().toggleBold().run(),
    },
    {
        name: 'italic',
        icon: 'ph-text-italic',
        label: 'Italic',
        action: () => editor.chain().focus().toggleItalic().run(),
    },
    {
        name: 'underline',
        icon: 'ph-text-underline',
        label: 'Underline',
        action: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
        name: 'strike',
        icon: 'ph-text-strikethrough',
        label: 'Strikethrough',
        action: () => editor.chain().focus().toggleStrike().run(),
    },
    {
        name: 'code',
        icon: 'ph-code',
        label: 'Inline code',
        action: () => editor.chain().focus().toggleCode().run(),
    },
    {
        name: 'link',
        icon: 'ph-link',
        label: 'Add or edit link',
        action: openLinkDialog,
    },
    {
        name: 'bulletList',
        icon: 'ph-list-bullets',
        label: 'Bullet list',
        action: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
        name: 'orderedList',
        icon: 'ph-list-numbers',
        label: 'Numbered list',
        action: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
        name: 'taskList',
        icon: 'ph-check-square',
        label: 'Checklist',
        action: () => editor.chain().focus().toggleTaskList().run(),
    },
];

function openLinkDialog() {
    linkSelection = {
        from: editor.state.selection.from,
        to: editor.state.selection.to,
    };
    linkUrl.value = editor.getAttributes('link').href || '';
    editingLink.value = editor.isActive('link');
    linkError.value = '';
    linkDialog.value = true;
}

function applyLink() {
    if (props.disabled) return;
    const input = linkUrl.value.trim();
    let href = /^[a-z][a-z\d+.-]*:/i.test(input) ? input : `https://${input}`;
    try {
        const url = new URL(href);
        if (
            !['http:', 'https:', 'mailto:'].includes(url.protocol) ||
            (url.protocol === 'mailto:' ? !url.pathname : !url.hostname)
        )
            throw new Error();
        href = url.href;
    } catch {
        linkError.value = 'Enter a valid web or email link.';
        return;
    }
    const chain = editor.chain().focus().setTextSelection(linkSelection);
    if (linkSelection.from === linkSelection.to && !editingLink.value) {
        chain
            .insertContent({
                type: 'text',
                text: href,
                marks: [{ type: 'link', attrs: { href } }],
            })
            .run();
    } else {
        chain.extendMarkRange('link').setLink({ href }).run();
    }
    linkDialog.value = false;
}

function removeLink() {
    if (props.disabled) return;
    editor
        .chain()
        .focus()
        .setTextSelection(linkSelection)
        .extendMarkRange('link')
        .unsetLink()
        .run();
    linkDialog.value = false;
}

watch(
    () => description.value,
    (value) => {
        if (JSON.stringify(value) === JSON.stringify(editor.getJSON())) return;
        applyingExternalContent = true;
        editor.commands.setContent(value || createEmptyDescription(), {
            emitUpdate: false,
        });
        applyingExternalContent = false;
    },
    { deep: true },
);
watch(
    () => props.disabled,
    (disabled) => editor.setEditable(!disabled),
    { immediate: true },
);
onBeforeUnmount(() => editor.destroy());
</script>

<style scoped>
/* Tiptap generates its own content DOM; Vuetify cannot style its nodes via component props. */
.kanban-description-editor--fill .kanban-description-editor__body {
    min-height: 0;
}
.kanban-description-editor--fill :deep(.kanban-description-editor__content) {
    flex: 1 0 auto;
}
.kanban-description-editor :deep(.kanban-description-editor__content) {
    min-height: 112px;
    outline: none;
}
.kanban-description-editor
    :deep(.kanban-description-editor__content > :first-child) {
    margin-top: 0;
}
.kanban-description-editor
    :deep(.kanban-description-editor__content > :last-child) {
    margin-bottom: 0;
}
.kanban-description-editor :deep(h3) {
    font-size: 1.05rem;
    line-height: 1.35;
    margin: 0.25rem 0 0.5rem;
}
.kanban-description-editor :deep(a) {
    cursor: pointer;
    color: rgb(var(--v-theme-primary));
    text-decoration: underline;
}
.kanban-description-editor :deep(code) {
    background: rgba(var(--v-theme-on-surface), 0.08);
    border-radius: 4px;
    padding: 2px 4px;
    font-size: 0.9em;
}
.kanban-description-editor :deep(ul[data-type='taskList']) {
    list-style: none;
    margin: 0;
    padding: 0;
}
.kanban-description-editor :deep(ul[data-type='taskList'] li) {
    align-items: flex-start;
    display: flex;
}
.kanban-description-editor :deep(ul[data-type='taskList'] li > label) {
    display: flex;
    align-items: center;
    flex: 0 0 auto;
    height: 1lh;
    margin-right: 0.5rem;
    user-select: none;
}
.kanban-description-editor :deep(ul[data-type='taskList'] li > div) {
    flex: 1 1 auto;
}
.kanban-description-editor :deep(ul[data-type='taskList'] li > div > :first-child) {
    margin-top: 0;
}
.kanban-description-editor
    :deep(ul[data-type='taskList'] input[type='checkbox']) {
    cursor: pointer;
    margin: 0;
}
.kanban-description-editor
    :deep(ul[data-type='taskList'] ul[data-type='taskList']) {
    margin: 0;
    padding-left: 1.5rem;
}
</style>
