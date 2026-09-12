<template>
    <div class="editor-chat-sidebar h-100">
        <LumosChatPanel
            scope="note"
            :note-id="activeNoteId"
            :is-visible="isVisible"
            start-empty
            show-header-actions
        >
            <template #header-prepend>
                <v-tooltip text="Hide" location="bottom">
                    <template v-slot:activator="{ props }">
                        <v-btn
                            v-bind="props"
                            icon="ph-caret-right"
                            aria-label="Hide"
                            variant="text"
                            density="comfortable"
                            rounded="lg"
                            @click="emit('close')"
                        />
                    </template>
                </v-tooltip>
            </template>
        </LumosChatPanel>
    </div>
</template>

<script setup>
import LumosChatPanel from './LumosChatPanel.vue';
import { useFoldersStore } from '../../stores/foldersStore';

import { computed } from 'vue';

const emit = defineEmits(['close']);

defineProps({
    isVisible: {
        type: Boolean,
        default: false,
    },
});

const store = useFoldersStore();
const activeNoteId = computed(() => store.activeNoteId);
</script>

<style scoped>
.editor-chat-sidebar {
    min-height: 0;
    overflow: hidden;
}
</style>
