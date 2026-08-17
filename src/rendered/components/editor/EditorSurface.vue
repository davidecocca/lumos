<template>
    <div class="editor-layout">
        <div class="editor-content">
            <v-card
                elevation="0"
                class="rounded-md border ma-3"
                rounded="lg"
                :loading="isLoading"
            >
                <v-card-text>
                    <div ref="editorShellRef" class="editor-shell">
                        <TableOverlayControls
                            v-if="editor"
                            :editor="editor"
                            :container-ref="editorShellRef"
                        />
                        <editor-content :editor="editor"/>
                    </div>
                </v-card-text>
            </v-card>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { EditorContent } from '@tiptap/vue-3'
import TableOverlayControls from './overlay-controls/TableOverlayControls.vue'
import './styles/editorContent.css'

defineProps({
    editor: {
        type: Object,
        default: null,
    },
    isLoading: {
        type: Boolean,
        default: false,
    },
})

const editorShellRef = ref(null)
</script>

<style scoped>
.editor-layout {
    display: flex;
    height: calc(100vh - 120px);
    position: relative;
}

.editor-content {
    flex: 1;
    transition: width 0.3s ease;
    overflow: hidden;
}

.editor-shell {
    position: relative;
}
</style>
