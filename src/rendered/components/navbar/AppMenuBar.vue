<template>
    <div class="app-menu-bar no-drag d-flex align-center">
        <v-menu
            v-for="menu in menus"
            :key="menu.title"
            location="bottom start"
            close-on-content-click
        >
            <template v-slot:activator="{ props }">
                <v-btn
                    v-bind="props"
                    variant="text"
                    density="comfortable"
                    class="text-body-2 px-2"
                    >{{ menu.title }}</v-btn
                >
            </template>

            <v-list
                density="compact"
                rounded="lg"
                min-width="320"
                class="pa-1 menu-list"
            >
                <template
                    v-for="(item, i) in visibleItems(menu.items)"
                    :key="i"
                >
                    <v-divider
                        v-if="item.type === 'separator'"
                        class="my-1"
                    ></v-divider>
                    <v-list-item
                        v-else
                        :disabled="isItemDisabled(item)"
                        rounded="lg"
                        @click="runAction(item.action)"
                    >
                        <div class="d-flex align-center ga-4">
                            <span class="text-truncate">{{ item.title }}</span>
                            <span
                                v-if="item.shortcut"
                                class="menu-shortcut ml-auto flex-shrink-0"
                                >{{ item.shortcut }}</span
                            >
                        </div>
                    </v-list-item>
                </template>
            </v-list>
        </v-menu>

        <AboutDialog v-model="aboutDialog" />
    </div>
</template>

<script setup>
import AboutDialog from './dialogs/AboutDialog.vue';

import { useFoldersStore } from '../../stores/foldersStore';
import { useRoute } from 'vue-router';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const emit = defineEmits(['open-search', 'toggle-sidebar']);

const { api } = window;

const route = useRoute();
const isNotesPage = computed(() => route.name === 'notes');

const foldersStore = useFoldersStore();

const aboutDialog = ref(false);

const TOGGLE_NOTE_CHAT_EVENT = 'lumos-toggle-note-chat';
const SAVE_NOTE_EVENT = 'lumos-save-note';

const getActiveEditor = () => window.__lumosActiveEditor || null;

const runEditorCommand = (command) => {
    const editor = getActiveEditor();

    if (editor) {
        if (command === 'undo') {
            editor.chain().focus().undo().run();
            return;
        }
        if (command === 'redo') {
            editor.chain().focus().redo().run();
            return;
        }
        if (command === 'select-all') {
            editor.chain().focus().selectAll().run();
            return;
        }
        editor.chain().focus().run();
    }

    const nativeCommand = {
        cut: 'cut',
        copy: 'copy',
        paste: 'paste',
    }[command];

    if (nativeCommand) {
        document.execCommand(nativeCommand);
    }
};

const menuActions = {
    'new-note': () => {
        if (foldersStore.folders.length) {
            foldersStore.openCreateNoteDialog(
                foldersStore.activeFolderId,
                true,
            );
        }
    },
    'new-folder': () => foldersStore.openCreateFolderDialog(),
    'save-note': () => window.dispatchEvent(new Event(SAVE_NOTE_EVENT)),
    'close-window': () => api.windowClose(),
    undo: () => runEditorCommand('undo'),
    redo: () => runEditorCommand('redo'),
    cut: () => runEditorCommand('cut'),
    copy: () => runEditorCommand('copy'),
    paste: () => runEditorCommand('paste'),
    'select-all': () => runEditorCommand('select-all'),
    find: () => emit('open-search'),
    'toggle-sidebar': () => emit('toggle-sidebar'),
    'toggle-chat': () =>
        window.dispatchEvent(new Event(TOGGLE_NOTE_CHAT_EVENT)),
    'toggle-fullscreen': () => api.toggleFullscreen(),
    devtools: () => api.openDevTools(),
    about: () => {
        aboutDialog.value = true;
    },
};

const menus = [
    {
        title: 'File',
        items: [
            { title: 'New Note', shortcut: 'Ctrl+N', action: 'new-note' },
            {
                title: 'New Folder',
                shortcut: 'Ctrl+Shift+N',
                action: 'new-folder',
            },
            { type: 'separator' },
            {
                title: 'Save Current Note',
                shortcut: 'Ctrl+S',
                action: 'save-note',
                requiresNote: true,
            },
            { type: 'separator' },
            {
                title: 'Close Window',
                shortcut: 'Ctrl+Q',
                action: 'close-window',
            },
        ],
    },
    {
        title: 'Edit',
        items: [
            {
                title: 'Undo',
                shortcut: 'Ctrl+Z',
                action: 'undo',
                requiresNote: true,
            },
            {
                title: 'Redo',
                shortcut: 'Ctrl+Shift+Z',
                action: 'redo',
                requiresNote: true,
            },
            { type: 'separator' },
            {
                title: 'Cut',
                shortcut: 'Ctrl+X',
                action: 'cut',
                requiresNote: true,
            },
            {
                title: 'Copy',
                shortcut: 'Ctrl+C',
                action: 'copy',
                requiresNote: true,
            },
            {
                title: 'Paste',
                shortcut: 'Ctrl+V',
                action: 'paste',
                requiresNote: true,
            },
            {
                title: 'Select All',
                shortcut: 'Ctrl+A',
                action: 'select-all',
                requiresNote: true,
            },
            { type: 'separator' },
            { title: 'Find in Notes', shortcut: 'Ctrl+K', action: 'find' },
        ],
    },
    {
        title: 'View',
        items: [
            { title: 'Toggle Sidebar', action: 'toggle-sidebar' },
            {
                title: 'Toggle Note Chat',
                shortcut: 'Ctrl+L',
                action: 'toggle-chat',
                requiresNote: true,
            },
            { type: 'separator' },
            {
                title: 'Toggle Full Screen',
                shortcut: 'F11',
                action: 'toggle-fullscreen',
            },
            { type: 'separator' },
            {
                title: 'Toggle Developer Tools',
                shortcut: 'Ctrl+Shift+I',
                action: 'devtools',
            },
        ],
    },
    {
        title: 'Help',
        items: [{ title: 'About Lumos', action: 'about' }],
    },
];

const isItemDisabled = (item) => {
    if (item.requiresNote && !isNotesPage.value) return true;
    if (item.action === 'new-note') return !foldersStore.folders.length;
    return Boolean(item.disabled);
};

const isDev = import.meta.env.DEV;

const visibleItems = (items) => {
    const filtered = items.filter((item) => {
        if (item.type === 'separator') return true;
        if (item.action === 'devtools' && !isDev) return false;
        return true;
    });

    while (filtered.length && filtered[0].type === 'separator')
        filtered.shift();
    while (
        filtered.length &&
        filtered[filtered.length - 1].type === 'separator'
    )
        filtered.pop();

    return filtered;
};

const runAction = (action) => {
    const handler = menuActions[action];
    if (handler) {
        handler();
    }
};

const handleKeyDown = (event) => {
    const key = event.key.toLowerCase();
    const hasModifier = event.ctrlKey || event.metaKey;

    if (hasModifier && !event.shiftKey && key === 'n') {
        event.preventDefault();
        menuActions['new-note']();
        return;
    }

    if (hasModifier && event.shiftKey && key === 'n') {
        event.preventDefault();
        menuActions['new-folder']();
        return;
    }

    if (hasModifier && key === 'q') {
        event.preventDefault();
        menuActions['close-window']();
        return;
    }

    if (event.key === 'F11') {
        event.preventDefault();
        menuActions['toggle-fullscreen']();
    }
};

onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.menu-shortcut {
    font-size: 12px;
    opacity: 0.6;
    white-space: nowrap;
}

.app-menu-bar {
    height: 100%;
}

.menu-list {
    border: 1px solid rgba(0, 0, 0, 0.08);
}
</style>
