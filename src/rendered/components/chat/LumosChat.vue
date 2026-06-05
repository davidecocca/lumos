<template>
    <div class="editor-chat-sidebar h-100">
        <LumosChatPanel
        scope="note"
        :note-id="activeNoteId"
        :is-visible="isVisible"
        start-empty
        show-header-actions
        />
    </div>
</template>

<script setup>
import LumosChatPanel from './LumosChatPanel.vue'
import { useFoldersStore } from '../../stores/foldersStore';

import { computed } from 'vue'

defineProps({
    isVisible: {
        type: Boolean,
        default: false,
    },
})

const store = useFoldersStore()
const activeNoteId = computed(() => store.activeNoteId)
</script>

<style scoped>
.editor-chat-sidebar {
    min-height: 0;
    overflow: hidden;
}
</style>
