<template>
    <!-- App bar -->
    <v-app-bar class="app-chrome drag" :height="40" color="nav-background" flat>
        <div
            class="app-chrome__leading no-drag"
            :class="{ 'app-chrome__leading--mac': isMacOS }"
        >
            <v-btn
                icon="ph-sidebar-simple"
                variant="text"
                density="comfortable"
                size="small"
                rounded="lg"
                @click="toggleNavbar"
            />
        </div>

        <AppMenuBar
            v-if="showAppChrome"
            @open-search="openSearch"
            @toggle-sidebar="toggleNavbar"
        />

        <v-spacer />

        <div v-if="showAppChrome" class="app-chrome__window-controls no-drag">
            <v-btn
                icon="ph-minus"
                variant="text"
                density="comfortable"
                size="small"
                @click="api.windowMinimize()"
            />
            <v-btn
                icon="ph-square"
                variant="text"
                density="comfortable"
                size="small"
                @click="api.windowMaximize()"
            />
            <v-btn
                icon="ph-x"
                variant="text"
                density="comfortable"
                size="small"
                @click="api.windowClose()"
            />
        </div>
    </v-app-bar>

    <!-- Navigation drawer -->
    <NavigationDrawer v-model:rail="isDrawerRail" @open-search="openSearch" />

    <!-- Main content area -->
    <v-main class="detail-pane">
        <v-container fluid>
            <router-view
                :key="$route.fullPath"
                :theme="themePreference"
                @update:theme="themePreference = $event"
                @home-ready="hideSplash"
            />
        </v-container>
    </v-main>

    <SearchDialog v-model="isSearchOpen" />
    <AboutDialog v-model="isAboutOpen" />
    <StartupSplash :visible="isSplashVisible" />
</template>

<script setup>
import NavigationDrawer from '../components/navbar/NavDrawer.vue';
import AppMenuBar from '../components/navbar/AppMenuBar.vue';
import SearchDialog from '../components/navbar/dialogs/SearchDialog.vue';
import AboutDialog from '../components/navbar/dialogs/AboutDialog.vue';
import StartupSplash from '../components/splashscreen/StartupSplash.vue';

import { aiPreferencesStore } from '../stores/aiPreferencesStore';
import { useFoldersStore } from '../stores/foldersStore';
import LlmService from '../services/llmService';
import { getGroqModels } from '../services/providers/groqService';

import { computed, watch, ref, onMounted, onBeforeUnmount } from 'vue';
import { useTheme } from 'vuetify';
import { useRoute, useRouter } from 'vue-router';

// Import the API from the Electron context
const { api } = window;
const isMacOS = api.platform === 'darwin';
const isAppChromePreview = ref(false);
const showAppChrome = computed(() => !isMacOS || isAppChromePreview.value);

const isDrawerRail = ref(false);
const isSearchOpen = ref(false);
const isAboutOpen = ref(false);
const isSplashVisible = ref(true);
const minSplashDuration = 2_000;
const splashOpenedAt = performance.now();
let splashTimer = null;

// Theme management
const theme = useTheme();

// Store for AI preferences
const aiStore = aiPreferencesStore();

// Store for folders and notes
const foldersStore = useFoldersStore();

const llmService = new LlmService();

// Get the current route
const route = useRoute();
const router = useRouter();
const TOGGLE_NOTE_CHAT_EVENT = 'lumos-toggle-note-chat';
const SAVE_NOTE_EVENT = 'lumos-save-note';

const toggleNavbar = () => {
    isDrawerRail.value = !isDrawerRail.value;
};

const toggleAppChromePreview = () => {
    isAppChromePreview.value = !isAppChromePreview.value;
};

const openSearch = () => {
    isSearchOpen.value = true;
};

const hideSplash = () => {
    const remaining = Math.max(
        0,
        minSplashDuration - (performance.now() - splashOpenedAt),
    );
    splashTimer = window.setTimeout(() => {
        isSplashVisible.value = false;
    }, remaining);
};

const handleMenuAction = (_, action) => {
    if (action === 'new-note') {
        if (foldersStore.folders.length) {
            foldersStore.openCreateNoteDialog(
                foldersStore.activeFolderId,
                true,
            );
        }
        return;
    }

    if (action === 'new-folder') {
        foldersStore.openCreateFolderDialog();
        return;
    }

    if (action === 'save-note') {
        window.dispatchEvent(new Event(SAVE_NOTE_EVENT));
        return;
    }

    if (action === 'open-search') {
        openSearch();
        return;
    }

    if (action === 'toggle-sidebar') {
        toggleNavbar();
        return;
    }

    if (action === 'toggle-app-menu-preview' && import.meta.env.DEV) {
        toggleAppChromePreview();
        return;
    }

    if (action === 'toggle-note-chat') {
        window.dispatchEvent(new Event(TOGGLE_NOTE_CHAT_EVENT));
        return;
    }

    if (action === 'open-chat') {
        isSearchOpen.value = false;
        router.push({ name: 'chat' });
        return;
    }

    if (action === 'about') {
        isAboutOpen.value = true;
    }
};

// Media query to detect OS theme changes
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

// Store user preference for theme; if not set, default to 'light'
const themePreference = ref(localStorage.getItem('themePreference') || 'light');

const updateTheme = () => {
    if (themePreference.value === 'auto') {
        // "auto" syncs with the OS setting
        theme.global.name.value = mediaQuery.matches ? 'dark' : 'light';
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

    if (aiStore.apiKeys.groq) {
        try {
            aiStore.updateAvailableModels(
                'groq',
                await getGroqModels(aiStore.apiKeys.groq),
            );
        } catch (error) {
            aiStore.updateAvailableModels('groq', []);
            console.error('Error fetching Groq models:', error);
        }
    }
};

onMounted(() => {
    // Set up listener for OS theme changes
    mediaQuery.addEventListener('change', handleOSChange);
    updateTheme();

    api.on('menu-action', handleMenuAction);

    // Load AI preferences once at app startup
    aiStore.loadPreferences();
    fetchAllModels();
    if (aiStore.codexEnabled) {
        api.getCodexStatus()
            .then((status) => aiStore.setCodexEnabled(true, status.models))
            .catch(() => aiStore.setCodexEnabled(false));
    }
});

onBeforeUnmount(() => {
    // Clean up the media query event listener
    mediaQuery.removeEventListener('change', handleOSChange);

    api.removeListener('menu-action', handleMenuAction);
    window.clearTimeout(splashTimer);
});

// Watch for manual changes to the theme preference and persist them
watch(themePreference, (newVal) => {
    localStorage.setItem('themePreference', newVal);
    updateTheme();
});

// Watch for route changes and reset activeNoteId if not on notes page
watch(
    () => route.name,
    (newRouteName) => {
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
    },
);

watch(
    [() => foldersStore.folders.length, () => route.name],
    ([folderCount, routeName]) => {
        api.updateMenuState({
            canCreateNote: folderCount > 0,
            hasOpenNote: routeName === 'notes',
        });
    },
    { immediate: true },
);
</script>

<style>
.drag {
    -webkit-app-region: drag;
}

.no-drag {
    -webkit-app-region: no-drag;
}

.app-chrome {
    z-index: 1010;
}

.app-chrome__leading,
.app-chrome__window-controls {
    display: flex;
    align-items: center;
}

.app-chrome__leading--mac {
    padding-left: 80px;
}

.app-chrome__window-controls {
    margin-right: 8px;
}

.detail-pane {
    min-height: 100vh;
}
</style>
