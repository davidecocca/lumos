<template>
    <v-navigation-drawer
    v-model="drawerOpen"
    width="350"
    :style="{ background: 'linear-gradient(to bottom, #F5F8FB, #EAF0F7)', borderRight: 'none' }"
    >
    <div class="drawer-container">
        <div class="sidebar-box">
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
            
            <!-- Divider shown only when the scrollable content overflows AND the content has been scrolled -->
            <transition name="divider-fade">
                <div v-if="hasScrollbar && hasScrolled" class="divider-container">
                    <v-divider></v-divider>
                </div>
            </transition>
            
            <!-- Scrollable content section with favorite notes and folders -->
            <div ref="navContent" class="nav-content">
                <FoldersTree />
            </div>
        </div>
    </div>
</v-navigation-drawer>
</template>

<script setup>
import FoldersTree from './FoldersTree.vue'
import PageRouter from './PageRouter.vue'

import { computed } from 'vue'
import { ref, onMounted, onBeforeUnmount } from 'vue'

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

// Detect whether the scrollable nav content currently shows a vertical scrollbar
const navContent = ref(null)
const hasScrollbar = ref(false)
const hasScrolled = ref(false)

function updateHasScrollbar() {
    const el = navContent.value
    if (!el) return
    // Compare scrollHeight to clientHeight for vertical overflow
    hasScrollbar.value = el.scrollHeight > el.clientHeight + 1
    // Update scrolled state in case scroll position changed
    hasScrolled.value = el.scrollTop > 0
}

function onScroll() {
    const el = navContent.value
    if (!el) return
    hasScrolled.value = el.scrollTop > 0
}

let ro = null
let mo = null
onMounted(() => {
    updateHasScrollbar()
    if (navContent.value) {
        // Scroll listener to detect when top content moves under header
        navContent.value.addEventListener('scroll', onScroll, { passive: true })
    }
    if (navContent.value && typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(updateHasScrollbar)
        ro.observe(navContent.value)
    }
    // MutationObserver to catch content changes (items added/removed)
    if (navContent.value && typeof MutationObserver !== 'undefined') {
        mo = new MutationObserver(updateHasScrollbar)
        mo.observe(navContent.value, { childList: true, subtree: true })
    }
})

onBeforeUnmount(() => {
    if (navContent.value) navContent.value.removeEventListener('scroll', onScroll)
    if (ro && navContent.value) ro.unobserve(navContent.value)
    if (mo) mo.disconnect()
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

/* Sidebar container */
.sidebar-box {
    margin: 12px;
    height: calc(100vh - 74px);
    background: rgba(255,255,255,0.85);
    border-radius: 16px;
    box-shadow: 0 6px 18px rgba(16,24,40,0.08);
    border: 1px solid rgba(16,24,40,0.06);
    display: flex;
    flex-direction: column;
    overflow: hidden; /* keep rounded corners when scrolling */
}

.sidebar-box .nav-header {
    background: transparent;
}

.sidebar-box .nav-content {
    padding: 8px 12px 16px 12px;
    overflow-y: auto;
}

/* Transition for the conditional divider: subtle fade and slide */
.divider-container {
    z-index: 9; /* sit under the sticky header */
}
.divider-fade-enter-active,
.divider-fade-leave-active {
    transition: opacity 120ms ease, transform 120ms ease;
}
.divider-fade-enter-from,
.divider-fade-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}
.divider-fade-enter-to,
.divider-fade-leave-from {
    opacity: 1;
    transform: translateY(0);
}
</style>