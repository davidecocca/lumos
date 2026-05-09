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
                style="margin-left: 72px;"
                @click.stop="toggleNavbar"
                ></v-app-bar-nav-icon>
            </template>
        </v-tooltip>
    </template>
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

<!-- Chat sidebar -->
<v-navigation-drawer
v-if="editorChatAvailable"
v-model="isChatOpen"
location="right"
:width="chatWidth"
:class="['chat-drawer', { 'no-transition': isResizing }, 'bg-background']"
>
<div class="chat-resizer" @mousedown="startResize"></div>
<LumosChatSidebar 
class="h-100"
:isVisible="isChatOpen"
/>
</v-navigation-drawer>
</template>

<script setup>
import NavigationDrawer from '../components/navbar/NavDrawer.vue';
import LumosChatSidebar from '../components/chat/LumosChatSidebar.vue';
import SearchDialog from '../components/navbar/SearchDialog.vue';

import { aiPreferencesStore } from '../stores/aiPreferencesStore';
import { useFoldersStore } from '../stores/foldersStore';
import LlmService from '../services/llmService';

import { computed, watch, ref, onMounted, onBeforeUnmount } from 'vue';
import { useTheme } from 'vuetify'
import { useRoute, useRouter } from 'vue-router'

// Import the API from the Electron context
const { api } = window;

const isDrawerRail = ref(false);
const isSearchOpen = ref(false);

// State for chat sidebar
const isChatOpen = ref(false);
const chatWidth = ref(450);

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
const editorChatAvailable = computed(() => route.name === 'notes' && Boolean(foldersStore.activeNoteId));

// Handler to update fullscreen state based on IPC messages
const updateFullscreen = (event, isFs) => {
    isFullscreen.value = isFs;
};

const toggleNavbar = () => {
    isDrawerRail.value = !isDrawerRail.value;
}

const openSidebarChat = () => {
    isChatOpen.value = true
}

const closeSidebarChat = () => {
    isChatOpen.value = false
}

const toggleSidebarChat = () => {
    if (!editorChatAvailable.value) return

    if (isChatOpen.value) {
        closeSidebarChat()
        return
    }
    
    openSidebarChat()
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
            isChatOpen.value = false
            router.push({ name: 'chat' })
            return
        }
        
        toggleSidebarChat()
    }
}

// Resize functionality
const isResizing = ref(false);

const startResize = (e) => {
    isResizing.value = true;
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
};

const resize = (e) => {
    if (!isResizing.value) return;
    const newWidth = window.innerWidth - e.clientX;
    chatWidth.value = Math.max(300, Math.min(800, newWidth));
};

const stopResize = () => {
    isResizing.value = false;
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResize);
};

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
    
    // Load chat width
    chatWidth.value = parseInt(localStorage.getItem('chatWidth')) || 450;
    
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
        isChatOpen.value = false;
    }
});

watch(editorChatAvailable, (available) => {
    if (!available) {
        isChatOpen.value = false
    }
})

// Watch for chat width changes and persist
watch(chatWidth, (newVal) => {
    localStorage.setItem('chatWidth', newVal);
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

.detail-chrome--chat-open {
    right: var(--chat-drawer-width);
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

/* Chat resizer */
.chat-resizer {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 5px;
    cursor: ew-resize;
    background-color: transparent;
    z-index: 10;
    user-select: none;
}

.chat-resizer:hover {
    background-color: rgba(0, 0, 0, 0.1);
}

.chat-drawer {
    position: relative;
    will-change: width;
    transition: width 0.2s ease;
}

.chat-drawer.no-transition {
    transition: none;
}

</style>
