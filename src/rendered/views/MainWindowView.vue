<template>
    <!-- App bar -->
    <v-app-bar
    elevation="1"
    density="compact"
    :class="['drag', { 'pl-16': !isFullscreen }]"
    >
    <v-app-bar-nav-icon variant="text" @click.stop="toggleNavbar" class="no-drag"/>
    <v-spacer></v-spacer>
    <v-btn
    :icon="isChatOpen ? 'mdi-chat-remove-outline' : 'mdi-chat-plus-outline'"
    variant="text"
    class="no-drag mr-2"
    @click="toggleChat"
    />
</v-app-bar>

<!-- Navigation drawer -->
<NavigationDrawer 
:isDrawerOpen="isDrawerOpen"
@update:isDrawerOpen="isDrawerOpen = $event"
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

<!-- Chat sidebar -->
<v-navigation-drawer
v-model="isChatOpen"
location="right"
:width="isChatExpanded ? 800 : 450"
:expanded="isChatExpanded"
>
<LumosChatSidebar 
:isChatExpanded="isChatExpanded"
@update:isChatExpanded="isChatExpanded = $event"
/>
</v-navigation-drawer>
</template>

<script setup>
    import NavigationDrawer from '../components/navbar/NavDrawer.vue';
    import LumosChatSidebar from '../components/chat/LumosChatSidebar.vue';
    
    import { aiPreferencesStore } from '../stores/aiPreferencesStore';
    import { useFoldersStore } from '../stores/foldersStore';
    import LlmService from '../services/llmService';
    
    import { watch, ref, onMounted, onBeforeUnmount, computed } from 'vue';
    import { useTheme, useDisplay } from 'vuetify'
    import { useRoute } from 'vue-router'
    
    // Import the API from the Electron context
    const { api } = window;
    
    const isDrawerOpen = ref(true);
    
    // State for chat sidebar
    const isChatOpen = ref(false);
    const isChatExpanded = ref(false);
    
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
    
    // Function to toggle chat expansion
    const toggleChatExpansion = () => {
        isChatExpanded.value = !isChatExpanded.value;
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
    });
    
    onBeforeUnmount(() => {
        // Clean up the media query event listener
        mediaQuery.removeEventListener("change", handleOSChange);
        
        // Remove the IPC listener for fullscreen changes to prevent memory leaks
        api.removeListener('fullscreen-changed', updateFullscreen);
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
</style>