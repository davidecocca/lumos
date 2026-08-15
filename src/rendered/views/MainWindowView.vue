<template>
    <!-- Navigation drawer -->
    <NavigationDrawer
    v-model:rail="isDrawerRail"
    @open-search="openSearch"
    />
    
    <!-- Main content area -->
    <v-main class="detail-pane">
        <v-container fluid>
            <router-view
            :key="$route.fullPath"
            :theme="themePreference"
            @update:theme="themePreference = $event"
            />
        </v-container>
    </v-main>
    
    <SearchDialog v-model="isSearchOpen" />
    <AboutDialog v-model="isAboutOpen" />
</template>

<script setup>
import NavigationDrawer from '../components/navbar/NavDrawer.vue';
import SearchDialog from '../components/navbar/dialogs/SearchDialog.vue';
import AboutDialog from '../components/navbar/dialogs/AboutDialog.vue';

import { aiPreferencesStore } from '../stores/aiPreferencesStore';
import { useFoldersStore } from '../stores/foldersStore';
import LlmService from '../services/llmService';

import { watch, ref, onMounted, onBeforeUnmount } from 'vue';
import { useTheme } from 'vuetify'
import { useRoute, useRouter } from 'vue-router'

// Import the API from the Electron context
const { api } = window;

const isDrawerRail = ref(false);
const isSearchOpen = ref(false);
const isAboutOpen = ref(false);

// State to manage fullscreen mode
const isFullscreen = ref(false);

// Theme management
const theme = useTheme()

// Store for AI preferences
const aiStore = aiPreferencesStore();

// Store for folders and notes
const foldersStore = useFoldersStore();

const llmService = new LlmService();

// Get the current route
const route = useRoute();
const router = useRouter();
const TOGGLE_NOTE_CHAT_EVENT = 'lumos-toggle-note-chat'
const SAVE_NOTE_EVENT = 'lumos-save-note'

// Handler to update fullscreen state based on IPC messages
const updateFullscreen = (event, isFs) => {
    isFullscreen.value = isFs;
};

const toggleNavbar = () => {
    isDrawerRail.value = !isDrawerRail.value;
}

const openSearch = () => {
    isSearchOpen.value = true;
}

const handleMenuAction = (_, action) => {
    if (action === 'new-note') {
        if (foldersStore.folders.length) {
            foldersStore.openCreateNoteDialog(foldersStore.activeFolderId, true)
        }
        return
    }

    if (action === 'new-folder') {
        foldersStore.openCreateFolderDialog()
        return
    }

    if (action === 'save-note') {
        window.dispatchEvent(new Event(SAVE_NOTE_EVENT))
        return
    }

    if (action === 'open-search') {
        openSearch()
        return
    }

    if (action === 'toggle-sidebar') {
        toggleNavbar()
        return
    }

    if (action === 'toggle-note-chat') {
        window.dispatchEvent(new Event(TOGGLE_NOTE_CHAT_EVENT))
        return
    }

    if (action === 'open-chat') {
        isSearchOpen.value = false
        router.push({ name: 'chat' })
        return
    }

    if (action === 'about') {
        isAboutOpen.value = true
    }
}

// Media query to detect OS theme changes
const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

// Store user preference for theme; if not set, default to 'light'
const themePreference = ref(localStorage.getItem('themePreference') || 'light');

const updateTheme = () => {
    if (themePreference.value === 'auto') {
        // "auto" syncs with the OS setting
        theme.global.name.value = mediaQuery.matches ? "dark" : "light";
    } else {
        // "light" or "dark" overrides OS setting
        theme.global.name.value = themePreference.value;
    }
};

// Handler for OS theme changes
const handleOSChange = () => {
    if (themePreference.value === 'auto') {
        updateTheme();
    }
};

// Fetch models for all providers
const fetchAllModels = async () => {
    try {
        // Fetch Ollama models
        const models = await llmService.getOllamaModels();
        aiStore.updateAvailableModels('ollama', models);
    } catch (error) {
        console.error('Error fetching models:', error);
    }
};

onMounted(() => {
    // Set up listener for OS theme changes
    mediaQuery.addEventListener("change", handleOSChange);
    updateTheme();
    
    // Register the IPC listener for fullscreen changes
    api.on('fullscreen-changed', updateFullscreen);
    api.on('menu-action', handleMenuAction);
    
    // Load AI preferences once at app startup
    aiStore.loadPreferences();
    fetchAllModels();
    
});

onBeforeUnmount(() => {
    // Clean up the media query event listener
    mediaQuery.removeEventListener("change", handleOSChange);
    
    // Remove the IPC listener for fullscreen changes to prevent memory leaks
    api.removeListener('fullscreen-changed', updateFullscreen);
    api.removeListener('menu-action', handleMenuAction);
});

// Watch for manual changes to the theme preference and persist them
watch(themePreference, (newVal) => {
    localStorage.setItem('themePreference', newVal);
    updateTheme();
});

// Watch for route changes and reset activeNoteId if not on notes page
watch(() => route.name, (newRouteName) => {
    if (newRouteName !== 'notes') {
        foldersStore.activeNoteId = null;
        foldersStore.activeNoteTitle = '';
        foldersStore.activeNoteCurrentFolderId = null;
        foldersStore.editorNoteId = null;
        foldersStore.editorNoteTitle = '';
        foldersStore.editorNoteCurrentFolderId = null;
        foldersStore.editorNoteFavorite = null;
        foldersStore.editorNoteDeletedId = null;
    }
});

watch(
    [() => foldersStore.folders.length, () => route.name],
    ([folderCount, routeName]) => {
        api.updateMenuState({
            canCreateNote: folderCount > 0,
            hasOpenNote: routeName === 'notes',
        });
    },
    { immediate: true }
);
</script>

<style>
/* Styles for the mac OS-like draggable area */
.drag {
    -webkit-app-region: drag;
}

.app-bar-controls {
    display: flex;
    align-items: center;
    height: 100%;
}

.no-drag {
    -webkit-app-region: no-drag;
}

.detail-chrome {
    position: fixed;
    top: 0;
    left: 350px;
    right: 0;
    z-index: 1010;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
}

.detail-chrome--rail {
    left: 72px;
}

.detail-chrome__left,
.detail-chrome__right {
    min-width: 48px;
    display: flex;
    align-items: center;
}

.detail-chrome__right {
    justify-content: flex-end;
}

.detail-pane {
    min-height: 100vh;
}

.detail-content {
    min-height: 100vh;
    padding-top: 56px;
}

</style>
