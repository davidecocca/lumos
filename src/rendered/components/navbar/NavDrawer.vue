<template>
    <v-navigation-drawer
    v-model="drawerOpen"
    width="350"
    >
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
import PageRouter from './PageRouter.vue'

import { computed } from 'vue'

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
</script>