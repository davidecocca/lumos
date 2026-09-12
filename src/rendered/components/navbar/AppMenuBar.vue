<template>
    <div class="app-menu-bar no-drag d-flex align-center ml-2">
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
                    class="app-menu-bar__button text-body-2"
                    >{{ menu.title }}</v-btn
                >
            </template>

            <v-list
                density="compact"
                rounded="lg"
                min-width="320"
                class="pl-1 pr-1 pt-2 pb-2 menu-list"
            >
                <template v-for="(item, i) in menu.items" :key="i">
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
                                >{{ formatShortcut(item.shortcut) }}</span
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
import { useRoute, useRouter } from 'vue-router';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { formatShortcut, isMac } from '../../utils/shortcuts';

const emit = defineEmits(['open-search', 'toggle-sidebar', 'close-tab']);

const { api } = window;

const route = useRoute();
const router = useRouter();
const isNotesPage = computed(() => route.name === 'notes');
const isDev = import.meta.env.DEV;
const isMacOS = isMac();

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
    'close-tab': () => emit('close-tab'),
    'quit-app': () => api.quitApp(),
    undo: () => runEditorCommand('undo'),
    redo: () => runEditorCommand('redo'),
    cut: () => runEditorCommand('cut'),
    copy: () => runEditorCommand('copy'),
    paste: () => runEditorCommand('paste'),
    'select-all': () => runEditorCommand('select-all'),
    find: () => emit('open-search'),
    'toggle-sidebar': () => emit('toggle-sidebar'),
    'toggle-chat': () => {
        if (isNotesPage.value) {
            window.dispatchEvent(new Event(TOGGLE_NOTE_CHAT_EVENT));
        }
    },
    'open-chat': () => router.push({ name: 'chat' }),
    'reset-zoom': () => api.resetZoom(),
    'zoom-in': () => api.zoomIn(),
    'zoom-out': () => api.zoomOut(),
    'toggle-fullscreen': () => api.toggleFullscreen(),
    reload: () => window.location.reload(),
    'force-reload': () => api.forceReload(),
    devtools: () => api.openDevTools(),
    about: () => {
        aboutDialog.value = true;
    },
};

const menus = [
    {
        title: 'File',
        items: [
            { title: 'New Note', shortcut: 'cmd+n', action: 'new-note' },
            {
                title: 'New Folder',
                shortcut: 'cmd+shift+n',
                action: 'new-folder',
            },
            { type: 'separator' },
            {
                title: 'Save Current Note',
                shortcut: 'cmd+s',
                action: 'save-note',
                requiresNote: true,
            },
            {
                title: 'Close Tab',
                shortcut: 'cmd+w',
                action: 'close-tab',
                requiresNote: true,
            },
            { type: 'separator' },
            {
                title: 'Close App',
                shortcut: 'cmd+q',
                action: 'quit-app',
            },
        ],
    },
    {
        title: 'Edit',
        items: [
            {
                title: 'Undo',
                shortcut: 'cmd+z',
                action: 'undo',
                requiresNote: true,
            },
            {
                title: 'Redo',
                shortcut: 'cmd+shift+z',
                action: 'redo',
                requiresNote: true,
            },
            { type: 'separator' },
            {
                title: 'Cut',
                shortcut: 'cmd+x',
                action: 'cut',
                requiresNote: true,
            },
            {
                title: 'Copy',
                shortcut: 'cmd+c',
                action: 'copy',
                requiresNote: true,
            },
            {
                title: 'Paste',
                shortcut: 'cmd+v',
                action: 'paste',
                requiresNote: true,
            },
            {
                title: 'Select All',
                shortcut: 'cmd+a',
                action: 'select-all',
                requiresNote: true,
            },
            { type: 'separator' },
            { title: 'Find in Notes', shortcut: 'cmd+k', action: 'find' },
        ],
    },
    {
        title: 'View',
        items: [
            {
                title: 'Toggle Sidebar',
                shortcut: 'cmd+\\',
                action: 'toggle-sidebar',
            },
            {
                title: 'Toggle Note Chat',
                shortcut: 'cmd+l',
                action: 'toggle-chat',
                requiresNote: true,
            },
            {
                title: 'Open Chat',
                shortcut: 'cmd+shift+l',
                action: 'open-chat',
            },
            { type: 'separator' },
            { title: 'Reset Zoom', shortcut: 'cmd+0', action: 'reset-zoom' },
            { title: 'Zoom In', shortcut: 'cmd+plus', action: 'zoom-in' },
            { title: 'Zoom Out', shortcut: 'cmd+-', action: 'zoom-out' },
            { type: 'separator' },
            {
                title: 'Toggle Full Screen',
                shortcut: isMacOS ? 'ctrl+cmd+f' : 'f11',
                action: 'toggle-fullscreen',
            },
            ...(isDev
                ? [
                      { type: 'separator' },
                      {
                          title: 'Reload',
                          shortcut: 'cmd+r',
                          action: 'reload',
                      },
                      {
                          title: 'Force Reload',
                          shortcut: 'cmd+shift+r',
                          action: 'force-reload',
                      },
                      {
                          title: 'Toggle Developer Tools',
                          shortcut: 'cmd+shift+i',
                          action: 'devtools',
                      },
                  ]
                : []),
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
        menuActions['quit-app']();
        return;
    }

    if (hasModifier && key === '\\') {
        event.preventDefault();
        menuActions['toggle-sidebar']();
        return;
    }

    if (hasModifier && key === 'k') {
        event.preventDefault();
        menuActions.find();
        return;
    }

    if (hasModifier && key === 'l') {
        event.preventDefault();
        if (event.shiftKey || isNotesPage.value) {
            menuActions[event.shiftKey ? 'open-chat' : 'toggle-chat']();
        }
        return;
    }

    if (hasModifier && key === 's') {
        event.preventDefault();
        if (isNotesPage.value) menuActions['save-note']();
        return;
    }

    if (hasModifier && key === 'w') {
        event.preventDefault();
        if (isNotesPage.value) menuActions['close-tab']();
        return;
    }

    if (hasModifier && key === '0') {
        event.preventDefault();
        menuActions['reset-zoom']();
        return;
    }

    if (hasModifier && (key === '=' || key === '+')) {
        event.preventDefault();
        menuActions['zoom-in']();
        return;
    }

    if (hasModifier && key === '-') {
        event.preventDefault();
        menuActions['zoom-out']();
        return;
    }

    if (isDev && hasModifier && key === 'r') {
        event.preventDefault();
        menuActions[event.shiftKey ? 'force-reload' : 'reload']();
        return;
    }

    if (isDev && hasModifier && event.shiftKey && key === 'i') {
        event.preventDefault();
        menuActions.devtools();
        return;
    }

    if (
        (isMacOS && event.ctrlKey && event.metaKey && key === 'f') ||
        (!isMacOS && event.key === 'F11')
    ) {
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
    gap: 4px;
}

.app-menu-bar__button {
    min-width: 0;
    padding-inline: 8px;
}

.menu-list {
    border: 1px solid rgba(0, 0, 0, 0.08);
}
</style>
