<template>
    <div class="editor-layout">
        <div class="editor-content">
            <div ref="editorShellRef" class="editor-shell">
                <TableOverlayControls
                    v-if="editor"
                    :editor="editor"
                    :container-ref="editorShellRef"
                />
                <editor-content :editor="editor" class="editor-document" />
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { EditorContent } from '@tiptap/vue-3';
import TableOverlayControls from './overlay-controls/TableOverlayControls.vue';
import './styles/editorContent.css';

defineProps({
    editor: {
        type: Object,
        default: null,
    },
});

const editorShellRef = ref(null);
</script>

<style scoped>
.editor-layout {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    position: relative;
}

.editor-content {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    transition: width 0.3s ease;
    overflow: hidden;
}

.editor-shell {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    position: relative;
    justify-content: center;
    overflow-y: auto;
}

.editor-document {
    flex: 0 1 900px;
    width: 100%;
    min-width: 0;
    max-width: 900px;
}

.editor-document :deep(.tiptap) {
    width: 100%;
    height: auto;
    min-height: 100%;
}
</style>
