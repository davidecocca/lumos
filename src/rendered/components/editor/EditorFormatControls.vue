<template>
    <div class="d-flex flex-row align-center justify-center bubble-menu-row">
        <v-btn-toggle
            class="bubble-menu-toggle"
            multiple
            divided
            variant="text"
            rounded="lg"
            density="compact"
            :max="0"
        >
            <v-tooltip
                v-for="control in controls"
                :key="control.label"
                :text="control.label"
                location="top"
            >
                <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" @click="control.action">
                        <v-icon>{{ control.icon }}</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
        </v-btn-toggle>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatShortcut } from '../../utils/shortcuts'

const props = defineProps({
    editor: {
        type: Object,
        required: true,
    },
})

const controls = computed(() => [
    {
        label: `Bold (${formatShortcut('⌘B')})`,
        icon: 'ph-text-b',
        action: () => props.editor.chain().focus().toggleBold().run(),
    },
    {
        label: `Italic (${formatShortcut('⌘I')})`,
        icon: 'ph-text-italic',
        action: () => props.editor.chain().focus().toggleItalic().run(),
    },
    {
        label: `Underline (${formatShortcut('⌘U')})`,
        icon: 'ph-text-underline',
        action: () => props.editor.chain().focus().toggleUnderline().run(),
    },
    {
        label: `Strike (${formatShortcut('⌘⇧S')})`,
        icon: 'ph-text-strikethrough',
        action: () => props.editor.chain().focus().toggleStrike().run(),
    },
    {
        label: `Superscript (${formatShortcut('⌘.')})`,
        icon: 'ph-text-superscript',
        action: () => props.editor.chain().focus().toggleSuperscript().run(),
    },
    {
        label: `Subscript (${formatShortcut('⌘,')})`,
        icon: 'ph-text-subscript',
        action: () => props.editor.chain().focus().toggleSubscript().run(),
    },
    {
        label: `Inline code (${formatShortcut('⌘E')})`,
        icon: 'ph-code',
        action: () => props.editor.chain().focus().toggleCode().run(),
    },
])
</script>

<style scoped>
.bubble-menu-row {
    min-height: 36px;
}

.bubble-menu-toggle,
.bubble-menu-toggle :deep(.v-btn) {
    height: 36px;
}
</style>
