<template>
    <v-navigation-drawer
    v-model="drawerOpen"
    width="350"
    :style="{ background: 'linear-gradient(to bottom, #EBF0F7, #DCE4F1)', borderRight: 'none' }"
    >
    <div class="drawer-container">
        <!-- Fixed header section with app logo, title and page router -->
        <div class="nav-header">
            <!-- App logo with title-->
            <div class="d-flex align-center justify-center ma-4">
                <v-img
                src="../assets/lumos_logo.png"
                max-height="48"
                max-width="48"
                />
                <p class="ml-1 font-weight-medium text-h5">Lumos</p>
            </div>
            
            <!-- Page Router -->
            <div class="ma-4">
                <PageRouter />
            </div>
        </div>
        
        <!-- Scrollable content section with favorite notes and folders -->
        <div class="nav-content">
            <FoldersTree />
        </div>
    </div>
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

<style scoped>
.drawer-container {
    height: 100vh;
    position: relative;
    display: flex;
    flex-direction: column;
}

.nav-header {
    position: sticky;
    top: 0;
    z-index: 10;
    flex-shrink: 0;
}

.nav-content {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
}

/* Hide the default v-navigation-drawer scrollbar */
:deep(.v-navigation-drawer__content) {
    overflow: hidden !important;
}
</style>