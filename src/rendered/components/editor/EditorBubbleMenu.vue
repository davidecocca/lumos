<template>
    <div v-if="editor">
        <bubble-menu
            class="bubble-menu"
            :should-show="shouldShow"
            :append-to="appendTo"
            :options="{
                offset: 6,
                placement: 'top',
                strategy: 'fixed',
            }"
            :editor="editor"
        >
            <div class="d-flex flex-column rounded-lg pa-2 elevation-4 bg-surface-light" style="width: 465px;">
                <EditorFormatControls :editor="editor" />

                <v-divider class="mt-1 mb-1"></v-divider>

                <div class="d-flex flex-row align-center justify-center bubble-menu-row">
                    <div class="flex-grow-1 bubble-menu-action" style="flex-basis: 0;">
                        <EditorBlockStyleMenu
                            :editor="editor"
                            :can-remove-details="canRemoveDetails"
                            @insert-details="emit('insert-details')"
                            @remove-details="emit('remove-details')"
                        />
                    </div>

                    <v-divider vertical class="mx-2"></v-divider>

                    <div class="flex-grow-1 bubble-menu-action" style="flex-basis: 0;">
                        <EditorColorMenu
                            label="Highlight"
                            icon="ph-highlighter"
                            :colors="highlightColors"
                            button-class="color-btn"
                            @select="emit('highlight', $event)"
                        />
                    </div>

                    <v-divider vertical class="mx-2"></v-divider>

                    <div class="flex-grow-1 bubble-menu-action" style="flex-basis: 0;">
                        <EditorColorMenu
                            label="Color"
                            icon="ph-palette"
                            :colors="textColors"
                            button-class="text-color-btn"
                            @select="emit('text-color', $event)"
                        />
                    </div>
                </div>

                <v-divider class="mt-1 mb-1"></v-divider>

                <EditorAISelectionMenu
                    :supported-tones="supportedTones"
                    :supported-languages="supportedLanguages"
                    @edit="emit('ai-edit')"
                    @fix-grammar="emit('ai-fix-grammar')"
                    @format-text="emit('ai-format-text')"
                    @improve-writing="emit('ai-improve-writing')"
                    @make-shorter="emit('ai-make-shorter')"
                    @make-longer="emit('ai-make-longer')"
                    @simplify="emit('ai-simplify')"
                    @change-tone="emit('ai-change-tone', $event)"
                    @translate-to="emit('ai-translate-to', $event)"
                />
            </div>
        </bubble-menu>
    </div>
</template>

<script setup>
import { BubbleMenu } from '@tiptap/vue-3/menus'
import EditorAISelectionMenu from './EditorAISelectionMenu.vue'
import EditorBlockStyleMenu from './EditorBlockStyleMenu.vue'
import EditorColorMenu from './EditorColorMenu.vue'
import EditorFormatControls from './EditorFormatControls.vue'

defineProps({
    editor: {
        type: Object,
        default: null,
    },
    shouldShow: {
        type: Function,
        required: true,
    },
    appendTo: {
        type: Function,
        required: true,
    },
    canRemoveDetails: {
        type: Function,
        required: true,
    },
    highlightColors: {
        type: Array,
        default: () => [],
    },
    textColors: {
        type: Array,
        default: () => [],
    },
    supportedTones: {
        type: Array,
        default: () => [],
    },
    supportedLanguages: {
        type: Array,
        default: () => [],
    },
})

const emit = defineEmits([
    'insert-details',
    'remove-details',
    'highlight',
    'text-color',
    'ai-edit',
    'ai-fix-grammar',
    'ai-format-text',
    'ai-improve-writing',
    'ai-make-shorter',
    'ai-make-longer',
    'ai-simplify',
    'ai-change-tone',
    'ai-translate-to',
])
</script>

<style scoped>
.bubble-menu {
    z-index: 1500;
}

.bubble-menu-row {
    min-height: 36px;
}

.bubble-menu-action {
    height: 36px;
}
</style>
