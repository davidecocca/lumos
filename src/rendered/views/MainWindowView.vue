<template>
    <!-- App bar -->
    <v-app-bar
    elevation="0"
    density="compact"
    :class="['drag border', { 'pl-16': !isFullscreen }]"
    >
    <v-app-bar-nav-icon variant="text" @click.stop="toggleNavbar" class="no-drag" icon="ph:ph-sidebar-simple"/>
    <v-spacer></v-spacer>
    <v-tooltip text="Toggle chat (⌘L)" location="bottom">
        <template v-slot:activator="{ props }">
            <v-btn
            v-bind="props"
            icon="ph:ph-chat"
            variant="text"
            class="no-drag mr-2"
            @click="toggleChat"
            />
        </template>
    </v-tooltip>
</v-app-bar>

<!-- Navigation drawer -->
    <NavigationDrawer 
    :isDrawerOpen="isDrawerOpen"
    @update:isDrawerOpen="isDrawerOpen = $event"
    @open-search="openSearch"
    />

<!-- Overlay for small screens when drawer is open -->
<div 
v-if="isSmallScreen && isDrawerOpen" 
class="drawer-overlay"
@click="closeNavbar"
></div>

<!-- Main content area -->
<v-main>
    <v-container>
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
v-model="isChatOpen"
location="right"
:width="chatWidth"
:expanded="isChatFullscreen"
:class="['chat-drawer', { 'no-transition': isResizing }]"
>
<div class="chat-resizer" @mousedown="startResize"></div>
<LumosChatSidebar 
class="h-100"
:isChatFullscreen="isChatFullscreen"
:isChatOpen="isChatOpen"
:isVisible="isChatOpen && !isChatFullscreen"
@update:isChatFullscreen="isChatFullscreen = $event"
@update:isChatOpen="isChatOpen = $event"
/>
</v-navigation-drawer>

<!-- Fullscreen chat dialog -->
<v-dialog
v-model="isChatFullscreen"
max-width="1200"
content-class="fullscreen-chat-dialog-content"
>
    <v-card class="fullscreen-chat-card" rounded="xl" elevation="0">
        <v-card-text class="pa-0 fullscreen-chat-card-content">
            <LumosChatSidebar 
            class="h-100"
            :isChatFullscreen="isChatFullscreen"
            :isChatOpen="isChatOpen"
            :isVisible="isChatFullscreen"
            @update:isChatFullscreen="isChatFullscreen = $event"
            @update:isChatOpen="isChatOpen = $event"
            />
        </v-card-text>
    </v-card>
</v-dialog>
</template>

<script setup>
    import NavigationDrawer from '../components/navbar/NavDrawer.vue';
    import LumosChatSidebar from '../components/chat/LumosChatSidebar.vue';
    import SearchDialog from '../components/navbar/SearchDialog.vue';
    
    import { aiPreferencesStore } from '../stores/aiPreferencesStore';
    import { useFoldersStore } from '../stores/foldersStore';
    import LlmService from '../services/llmService';
    
    import { watch, ref, onMounted, onBeforeUnmount, computed } from 'vue';
    import { useTheme, useDisplay } from 'vuetify'
    import { useRoute } from 'vue-router'
    
    // Import the API from the Electron context
    const { api } = window;
    
    const isDrawerOpen = ref(true);
    const isSearchOpen = ref(false);
    
    // State for chat sidebar
    const isChatOpen = ref(false);
    const isChatFullscreen = ref(false);
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
    
    // Add display utilities for responsive behavior
    const { smAndDown } = useDisplay();
    
    // Compute whether we're on a small screen
    const isSmallScreen = computed(() => smAndDown.value);
    
    // Get the current route
    const route = useRoute();
    
    // Handler to update fullscreen state based on IPC messages
    const updateFullscreen = (event, isFs) => {
        isFullscreen.value = isFs;
    };
    
    // Function to update drawer based on screen size
    const updateDrawerForScreenSize = () => {
        isDrawerOpen.value = !isSmallScreen.value;
    };
    
    // Function to toggle the navigation drawer
    const toggleNavbar = () => {
        isDrawerOpen.value = !isDrawerOpen.value;
    }
    
    // Function to toggle chat sidebar
    const toggleChat = () => {
        isChatOpen.value = !isChatOpen.value;
    }

    const openSidebarChat = () => {
        isChatFullscreen.value = false
        isChatOpen.value = true
    }

    const closeSidebarChat = () => {
        isChatOpen.value = false
    }

    const toggleSidebarChat = () => {
        if (isChatOpen.value && !isChatFullscreen.value) {
            closeSidebarChat()
            return
        }

        openSidebarChat()
    }

    const openFullscreenChat = () => {
        isSearchOpen.value = false
        isChatOpen.value = false
        isChatFullscreen.value = true
    }

    const closeFullscreenChat = () => {
        isChatFullscreen.value = false
    }

    const toggleFullscreenChat = () => {
        if (isChatFullscreen.value) {
            closeFullscreenChat()
            return
        }

        openFullscreenChat()
    }

    const openSearch = () => {
        if (isChatFullscreen.value) {
            isChatFullscreen.value = false
        }
        isSearchOpen.value = true;
    }

    const handleWindowKeyDown = (event) => {
        const hasCommandModifier = event.metaKey || event.ctrlKey
        if (!hasCommandModifier) return

        const normalizedKey = event.key.toLowerCase()

        if (normalizedKey === 'k') {
            event.preventDefault()
            isSearchOpen.value = !isSearchOpen.value
            if (isSearchOpen.value && isChatFullscreen.value) {
                isChatFullscreen.value = false
            }
            return
        }

        if (normalizedKey === 'l') {
            event.preventDefault()

            if (event.shiftKey) {
                toggleFullscreenChat()
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
    
    // Function to close the navigation drawer
    const closeNavbar = function() {
        isDrawerOpen.value = false;
    }
    
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
    
    // Watch for screen size changes and update drawer accordingly
    watch(() => isSmallScreen.value, () => {
        updateDrawerForScreenSize();
    }, { immediate: true });
    
    // Watch for route changes and reset activeNoteId if not on notes page
    watch(() => route.name, (newRouteName) => {
        if (newRouteName !== 'notes') {
            foldersStore.activeNoteId = null;
            foldersStore.activeNoteTitle = '';
            foldersStore.activeNoteCurrentFolderId = null;
        }
    });

    watch(isChatFullscreen, (newValue) => {
        if (newValue) {
            isSearchOpen.value = false
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
    
    /* Style used to make the drawer closable by clicking outside of it */
    .drawer-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 5; /* Make sure this is below the drawer but above content */
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

    .fullscreen-chat-dialog-content {
        height: clamp(660px, 80vh, 880px);
        max-height: calc(100vh - 72px);
        display: flex;
        flex-direction: column;
    }

    .fullscreen-chat-card {
        border: 1px solid rgba(100, 116, 139, 0.16);
        overflow: hidden;
        height: 100%;
        max-height: 100%;
        display: flex;
        flex-direction: column;
    }

    .fullscreen-chat-card-content {
        height: 100%;
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

</style>
