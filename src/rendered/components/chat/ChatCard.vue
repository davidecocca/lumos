<template>
    <v-card
    :color="props.message.bgColor"
    :variant="props.message.variant"
    rounded="lg"
    >
    <v-card-text
    v-if="isBotMessage"
    class="chat-markdown"
    v-html="renderedMessage"
    />
    <v-card-text v-else>
        {{ props.message.text }}
    </v-card-text>
    <div v-if="props.showSources && props.message.sources !== null && props.message.sources.length > 0">
        <v-card-actions
        style="flex-direction: column; align-items: flex-start; gap: 8px;"
        >
        <v-chip
        v-for="(note, index) in message.sources"
        :key="index"
        variant="tonal"
        rounded="lg"
        size="small"
        prepend-icon="ph-file"
        @click="openNote(note.id)"
        class="text-none text-label-large"
        >
        {{ note.folderName }} / {{ note.title }}
    </v-chip>
</v-card-actions>
</div>
</v-card>
</template>

<script setup>
    import { computed } from 'vue'
    import { marked, Renderer } from 'marked'

    const props = defineProps({
        message: {
            type: Object,
            required: true
        },
        showSources: {
            type: Boolean,
            default: true
        }
    })

    const emit = defineEmits(['open-source'])

    const markdownRenderer = new Renderer()
    const escapeHtml = (value) => String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')

    markdownRenderer.html = ({ text }) => escapeHtml(text)

    const isBotMessage = computed(() => props.message.user === 'bot')

    const renderedMessage = computed(() => marked.parse(props.message.text || '', {
        async: false,
        breaks: true,
        renderer: markdownRenderer,
    }))
    
    // Open the note when the user clicks on the citing
    const openNote = (nodeId) => {
        emit('open-source', nodeId)
    }
</script>

<style scoped>
.chat-markdown {
    line-height: 1.65;
}

.chat-markdown :deep(p:last-child),
.chat-markdown :deep(ul:last-child),
.chat-markdown :deep(ol:last-child),
.chat-markdown :deep(pre:last-child),
.chat-markdown :deep(blockquote:last-child) {
    margin-bottom: 0;
}

.chat-markdown :deep(p) {
    margin-bottom: 0.75rem;
}

.chat-markdown :deep(ul),
.chat-markdown :deep(ol) {
    margin-bottom: 0.75rem;
    padding-left: 1.25rem;
}

.chat-markdown :deep(pre) {
    margin: 0.75rem 0;
    padding: 0.75rem;
    overflow-x: auto;
    border-radius: 8px;
    background: rgba(var(--v-theme-on-surface), 0.08);
}

.chat-markdown :deep(code) {
    font-size: 0.9em;
}

.chat-markdown :deep(:not(pre) > code) {
    padding: 0.1rem 0.3rem;
    border-radius: 4px;
    background: rgba(var(--v-theme-on-surface), 0.08);
}

.chat-markdown :deep(blockquote) {
    margin: 0.75rem 0;
    padding-left: 0.75rem;
    border-left: 3px solid rgba(var(--v-theme-on-surface), 0.24);
    color: rgba(var(--v-theme-on-surface), 0.78);
}
</style>
