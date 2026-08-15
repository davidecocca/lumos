<template>
    <div v-if="editor">
        <bubble-menu
            class="bubble-menu"
            :plugin-key="pluginKey"
            :should-show="shouldShow"
            :append-to="appendTo"
            :options="{
                offset: 6,
                placement: 'top',
                strategy: 'fixed',
            }"
            :editor="editor"
        >
            <div class="d-flex flex-column rounded-lg pa-1 bg-surface-light">
                <v-container class="pa-0" fluid>
                    <v-row
                        v-for="row in formatRows"
                        :key="row.key"
                        dense
                        no-gutters
                    >
                        <v-col
                            v-for="item in row.items"
                            :key="item.key"
                        >
                            <v-tooltip v-if="item.type === 'button'" :text="item.label" location="top">
                                <template v-slot:activator="{ props }">
                                    <v-btn
                                        v-bind="props"
                                        :icon="item.icon"
                                        variant="text"
                                        rounded="lg"
                                        size="small"
                                        @click="item.action"
                                    />
                                </template>
                            </v-tooltip>

                            <v-menu v-else-if="item.type === 'style'" min-width="200px" width="200px">
                                <template v-slot:activator="{ props: menuProps }">
                                    <v-tooltip :text="item.label" location="top">
                                        <template v-slot:activator="{ props: tooltipProps }">
                                            <v-btn
                                                v-bind="{ ...menuProps, ...tooltipProps }"
                                                :icon="item.icon"
                                                variant="text"
                                                rounded="lg"
                                                size="small"
                                            />
                                        </template>
                                    </v-tooltip>
                                </template>

                                <EditorBlockStyleMenu
                                    :editor="editor"
                                    :can-remove-details="canRemoveDetails"
                                    @insert-details="emit('insert-details')"
                                    @remove-details="emit('remove-details')"
                                />
                            </v-menu>

                            <v-menu v-else-if="item.type === 'highlight'">
                                <template v-slot:activator="{ props: menuProps }">
                                    <v-tooltip :text="item.label" location="top">
                                        <template v-slot:activator="{ props: tooltipProps }">
                                            <v-btn
                                                v-bind="{ ...menuProps, ...tooltipProps }"
                                                :icon="item.icon"
                                                variant="text"
                                                rounded="lg"
                                                size="small"
                                            />
                                        </template>
                                    </v-tooltip>
                                </template>

                                <EditorColorMenu
                                    :colors="highlightColors"
                                    @select="emit('highlight', $event)"
                                />
                            </v-menu>

                            <v-menu v-else-if="item.type === 'color'">
                                <template v-slot:activator="{ props: menuProps }">
                                    <v-tooltip :text="item.label" location="top">
                                        <template v-slot:activator="{ props: tooltipProps }">
                                            <v-btn
                                                v-bind="{ ...menuProps, ...tooltipProps }"
                                                :icon="item.icon"
                                                variant="text"
                                                rounded="lg"
                                                size="small"
                                            />
                                        </template>
                                    </v-tooltip>
                                </template>

                                <EditorColorMenu
                                    :colors="textColors"
                                    @select="emit('text-color', $event)"
                                />
                            </v-menu>
                        </v-col>
                    </v-row>
                </v-container>

                <v-divider class="my-1"></v-divider>

                <v-container class="pa-0" fluid>
                    <v-row dense no-gutters>
                        <v-col
                            v-for="item in aiQuickActions"
                            :key="item.key"
                            class="d-flex justify-center"
                        >
                            <v-tooltip :text="item.label" location="bottom">
                                <template v-slot:activator="{ props }">
                                    <v-btn
                                        v-bind="props"
                                        :icon="item.icon"
                                        variant="text"
                                        rounded="lg"
                                        size="small"
                                        @click="emit(item.event)"
                                    />
                                </template>
                            </v-tooltip>
                        </v-col>

                        <v-col class="d-flex justify-center">
                            <v-menu>
                                <template v-slot:activator="{ props: menuProps }">
                                    <v-tooltip text="Other AI options" location="bottom">
                                        <template v-slot:activator="{ props: tooltipProps }">
                                            <v-btn
                                                v-bind="{ ...menuProps, ...tooltipProps }"
                                                icon="ph-dots-three"
                                                variant="text"
                                                rounded="lg"
                                                size="small"
                                            />
                                        </template>
                                    </v-tooltip>
                                </template>

                                <EditorAIMenu
                                    :supported-tones="supportedTones"
                                    :supported-languages="supportedLanguages"
                                    @make-shorter="emit('ai-make-shorter')"
                                    @make-longer="emit('ai-make-longer')"
                                    @simplify="emit('ai-simplify')"
                                    @change-tone="emit('ai-change-tone', $event)"
                                    @translate-to="emit('ai-translate-to', $event)"
                                />
                            </v-menu>
                        </v-col>
                    </v-row>
                </v-container>
            </div>
        </bubble-menu>
    </div>
</template>

<script setup>
import { BubbleMenu } from '@tiptap/vue-3/menus'
import { computed } from 'vue'
import EditorAIMenu from './EditorAIMenu.vue'
import EditorBlockStyleMenu from './EditorBlockStyleMenu.vue'
import EditorColorMenu from './EditorColorMenu.vue'
import { formatShortcut } from '../../utils/shortcuts'

const props = defineProps({
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
    pluginKey: {
        type: String,
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

const formatRows = computed(() => [
    {
        key: 'format-row-1',
        items: [
            {
                key: 'bold',
                type: 'button',
                label: `Bold (${formatShortcut('⌘B')})`,
                icon: 'ph-text-b',
                action: () => props.editor.chain().focus().toggleBold().run(),
            },
            {
                key: 'italic',
                type: 'button',
                label: `Italic (${formatShortcut('⌘I')})`,
                icon: 'ph-text-italic',
                action: () => props.editor.chain().focus().toggleItalic().run(),
            },
            {
                key: 'underline',
                type: 'button',
                label: `Underline (${formatShortcut('⌘U')})`,
                icon: 'ph-text-underline',
                action: () => props.editor.chain().focus().toggleUnderline().run(),
            },
            {
                key: 'strike',
                type: 'button',
                label: `Strike (${formatShortcut('⌘⇧S')})`,
                icon: 'ph-text-strikethrough',
                action: () => props.editor.chain().focus().toggleStrike().run(),
            },
            {
                key: 'code',
                type: 'button',
                label: `Inline code (${formatShortcut('⌘E')})`,
                icon: 'ph-code',
                action: () => props.editor.chain().focus().toggleCode().run(),
            },
        ],
    },
    {
        key: 'format-row-2',
        items: [
            {
                key: 'style',
                type: 'style',
                label: 'Style',
                icon: 'ph-text-t',
            },
            {
                key: 'highlight',
                type: 'highlight',
                label: 'Highlight',
                icon: 'ph-highlighter',
            },
            {
                key: 'color',
                type: 'color',
                label: 'Color',
                icon: 'ph-palette',
            },
            {
                key: 'superscript',
                type: 'button',
                label: `Superscript (${formatShortcut('⌘.')})`,
                icon: 'ph-text-superscript',
                action: () => props.editor.chain().focus().toggleSuperscript().run(),
            },
            {
                key: 'subscript',
                type: 'button',
                label: `Subscript (${formatShortcut('⌘,')})`,
                icon: 'ph-text-subscript',
                action: () => props.editor.chain().focus().toggleSubscript().run(),
            },
        ],
    },
])

const aiQuickActions = [
    {
        key: 'edit',
        label: 'Edit with AI',
        icon: 'ph-brain',
        event: 'ai-edit',
    },
    {
        key: 'fix-grammar',
        label: 'Fix grammar with AI',
        icon: 'ph-bandaids',
        event: 'ai-fix-grammar',
    },
    {
        key: 'format-text',
        label: 'Format text with AI',
        icon: 'ph-hammer',
        event: 'ai-format-text',
    },
    {
        key: 'improve-writing',
        label: 'Improve writing with AI',
        icon: 'ph-sparkle',
        event: 'ai-improve-writing',
    },
]
</script>

<style scoped>
.bubble-menu {
    z-index: 1500;
}
</style>
