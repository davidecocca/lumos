<template>
    <v-layout class="rounded rounded-md border">
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
            <v-row no-gutters>
                <!-- Transition wrapper for navbar icon column -->
                <transition name="navbar-col-slide-fade">
                    <v-col
                    v-if="showNavbarIcon"
                    class="navbar-col"
                    cols="auto"
                    >
                    <div class="pt-4 pb-4 pl-2 pr-2" height="100%">
                        <v-btn
                        icon="mdi-menu"
                        @click="toggleNavbar"
                        variant="text"
                        />
                    </div>
                </v-col>
            </transition>
            
            <!-- Main content -->
            <v-col class="grow">
                <v-container class="d-flex flex-column">
                    <router-view
                    :key="$route.fullPath"
                    :theme="themePreference"
                    @update:theme="themePreference = $event"
                    />
                </v-container>
            </v-col>
        </v-row>
    </v-main>
</v-layout>
</template>

<script setup>
import NavigationDrawer from '../components/navbar/NavDrawer.vue';

import { aiPreferencesStore } from '../stores/aiPreferencesStore';
import LlmService from '../services/llmService';

import { watch, ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useTheme, useDisplay } from 'vuetify'

const isDrawerOpen = ref(true);
const showNavbarIcon = ref(false);

// Theme management
const theme = useTheme()

// Store for AI preferences
const aiStore = aiPreferencesStore();
const llmService = new LlmService();

// Add display utilities for responsive behavior
const { smAndDown } = useDisplay();

// Compute whether we're on a small screen
const isSmallScreen = computed(() => smAndDown.value);

// Function to update drawer based on screen size
const updateDrawerForScreenSize = () => {
    if (isSmallScreen.value) {
        isDrawerOpen.value = false;
    } else {
        isDrawerOpen.value = true;
    }
};

// Function to toggle the navigation drawer
const toggleNavbar = function() {
    if (isDrawerOpen.value) {
        isDrawerOpen.value = false;
    } else {
        isDrawerOpen.value = true;
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

// Set up listener for OS theme changes
onMounted(() => {
    mediaQuery.addEventListener("change", handleOSChange);
    updateTheme();
    
    // Load AI preferences once at app startup
    aiStore.loadPreferences();
    fetchAllModels();
});

// Clean up the media query event listener
onBeforeUnmount(() => {
    mediaQuery.removeEventListener("change", handleOSChange);
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


// Watch for changes to the drawer state and update navbar icon visibility
watch(isDrawerOpen, (newVal) => {
    if (newVal) {
        showNavbarIcon.value = false;
    } else {
        showNavbarIcon.value = true;
    }
});
</script>

<style>
.drawer-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 5; /* Make sure this is below the drawer but above content */
}

/* A fixed max-width for the navbar icon column */
.navbar-col {
    max-width: 104px;
}

/* Smooth slide & fade for the navbar icon column */
.navbar-col-slide-fade-enter-active,
.navbar-col-slide-fade-leave-active {
    transition: 
    max-width 0.4s cubic-bezier(0.25, 0.8, 0.25, 1),
    transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1),
    opacity 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
    overflow: hidden;
}

.navbar-col-slide-fade-enter-from,
.navbar-col-slide-fade-leave-to {
    max-width: 0 !important;
    transform: translateX(-100%);
    opacity: 0;
}

.navbar-col-slide-fade-enter-to,
.navbar-col-slide-fade-leave-from {
    max-width: 104px !important;
    transform: translateX(0);
    opacity: 1;
}
</style>