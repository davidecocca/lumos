<template>
    <!--  App bar with draggable area -->
    <v-app-bar
    elevation="0"
    density="compact"
    class="drag border-b"
    color="background"
    >
    <template v-slot:prepend>
        <v-tooltip text="Toggle sidebar" location="right">
            <template v-slot:activator="{ props }">
                <v-app-bar-nav-icon
                v-bind="props"
                icon="ph-sidebar-simple"
                class="no-drag"
                density="comfortable"
                :style="{ marginLeft: api.platform === 'darwin' ? '72px' : '6px' }"
                @click.stop="toggleNavbar"
                ></v-app-bar-nav-icon>
            </template>
        </v-tooltip>

        <AppMenuBar
            v-if="api.platform !== 'darwin'"
            class="ml-2 mr-2"
            @open-search="openSearch"
            @toggle-sidebar="toggleNavbar"
        />
    </template>

    <v-spacer />

    <div v-if="api.platform !== 'darwin'" class="no-drag mr-4">
        <v-row class="ga-4">
            <v-btn
                variant="text"
                icon="ph-minus"
                density="confortable"
                size="small"
                @click="api.windowMinimize"
            ></v-btn>
            <v-btn
                variant="text"
                icon="ph-cards"
                density="confortable"
                size="small"
                @click="api.windowMaximize"
            ></v-btn>
            <v-btn
                variant="text"
                icon="ph-x"
                density="confortable"
                size="small"
                @click="api.windowClose"
            ></v-btn>
        </v-row>
    </div>
    </v-app-bar>

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
</template>

<script setup>
import NavigationDrawer from '../components/navbar/NavDrawer.vue';
import AppMenuBar from '../components/navbar/AppMenuBar.vue';
import SearchDialog from '../components/navbar/dialogs/SearchDialog.vue';

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

const handleWindowKeyDown = (event) => {
    const hasCommandModifier = event.metaKey || event.ctrlKey
    if (!hasCommandModifier) return
    
    const normalizedKey = event.key.toLowerCase()
    
    if (normalizedKey === 'k') {
        event.preventDefault()
        isSearchOpen.value = !isSearchOpen.value
        return
    }
    
    if (normalizedKey === 'l') {
        event.preventDefault()
        
        if (event.shiftKey) {
            isSearchOpen.value = false
            router.push({ name: 'chat' })
            return
        }
        
        window.dispatchEvent(new Event(TOGGLE_NOTE_CHAT_EVENT))
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
    
    // Load AI preferences once at app startup
    aiStore.loadPreferences();
    fetchAllModels();
    
    window.addEventListener('keydown', handleWindowKeyDown);
});

onBeforeUnmount(() => {
    // Clean up the media query event listener
    mediaQuery.removeEventListener("change", handleOSChange);
    
    // Remove the IPC listener for fullscreen changes to prevent memory leaks
    api.removeListener('fullscreen-changed', updateFullscreen);
    window.removeEventListener('keydown', handleWindowKeyDown);
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
</script>

<style>
/* Styles for the mac OS-like draggable area */
.drag {
    -webkit-app-region: drag;
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
