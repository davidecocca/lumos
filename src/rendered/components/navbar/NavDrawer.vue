<template>
    <v-navigation-drawer
    model-value
    v-model:rail="railModel"
    width="350"
    permanent
    color="nav-background"
    >
    <div class="d-flex flex-column h-100">
        <div class="flex-shrink-0">
            <PageRouter
            :rail="railModel"
            @open-search="emit('open-search')"
            />
        </div>
        
        <v-divider class="flex-shrink-0"></v-divider>
        
        <div class="flex-grow-1 overflow-y-auto">
            <v-slide-x-transition mode="out-in">
                <div v-if="!railModel" key="folders">
                    <FoldersTree />
                </div>
                <div v-else key="compact-folders">
                    <CompactFoldersTree />
                </div>
            </v-slide-x-transition>
        </div>
    </div>
</v-navigation-drawer>
</template>

<script setup>
import PageRouter from './PageRouter.vue'
import FoldersTree from './FoldersTree.vue'
import CompactFoldersTree from './CompactFoldersTree.vue'

import { computed } from 'vue'

const props = defineProps({
    rail: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['update:rail', 'open-search'])

const railModel = computed({
    get: () => props.rail,
    set: (value) => emit('update:rail', value)
})

</script>

<style scoped>
/* Remove default avatar circle and make it square for the app logo */
.app-logo-list-item :deep(.v-avatar) {
    border-radius: 0;
}
</style>
