<template>
    <v-navigation-drawer
    v-model="drawerOpen"
    width="350"
    :color="navbarColor"
    >
    <!-- Navbar header -->
    <div class="d-flex align-center pt-4 pb-4 pl-1">
        <!-- Button to toggle the drawer -->
        <v-btn
        icon="mdi-menu"
        @click="drawerOpen = !drawerOpen"
        variant="text"
        class="mr-2"
        />
        
        <!-- App title with logo at the top of navbar -->
        <AppTitle />
    </div>
    
    <!-- Divider -->
    <v-divider></v-divider>
    
    <!-- Search bar -->
    <v-text-field
    append-inner-icon="mdi-magnify"
    density="compact"
    label="Search"
    variant="text"
    hide-details
    single-line
    @click:append-inner="onClick"
    class="ma-1"
    ></v-text-field>
    
    <!-- Page Router -->
    <PageRouter />
    
    <!-- Divider -->
    <v-divider class="mt-3"></v-divider>
    
    <!-- Folders and notes -->
    <FoldersTree />
</v-navigation-drawer>
</template>

<script setup>
import FoldersTree from './FoldersTree.vue'
import AppTitle from './AppTitle.vue'
import PageRouter from './PageRouter.vue'

import { computed } from 'vue'
import { useTheme } from 'vuetify'

const theme = useTheme()

const props = defineProps({
    isDrawerOpen: {
        type: Boolean,
        default: true
    }
})

const emit = defineEmits(['update:isDrawerOpen'])

const drawerOpen = computed({
    get: () => props.isDrawerOpen,
    set: (value) => {
        emit('update:isDrawerOpen', value)
    }
})

const navbarColor = computed(() => {
    return theme.global.name.value === 'dark' ? '#1e1e1e' : 'grey-lighten-4'
})
</script>