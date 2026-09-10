<template>
    <v-card
        class="border"
        elevation="0"
        rounded="xl"
        width="calc(100vw - 48px)"
        max-width="600"
        color="surface-dark"
    >
        <v-card-text class="px-3 py-1">
            <v-text-field
                ref="inputRef"
                v-model="prompt"
                variant="text"
                density="comfortable"
                rounded="lg"
                hide-details
                autofocus
                single-line
                placeholder="Ask AI to write..."
                prepend-inner-icon="ph-sparkle"
                :disabled="loading"
                @keydown="onKeydown"
            >
                <template #append-inner>
                    <div class="d-flex align-center ga-1 ms-2">
                        <v-tooltip
                            :text="hasPreview ? 'Regenerate' : 'Submit'"
                            location="bottom"
                        >
                            <template #activator="{ props: tooltipProps }">
                                <v-btn
                                    v-bind="tooltipProps"
                                    :icon="
                                        hasPreview
                                            ? 'ph-arrows-clockwise'
                                            : 'ph-arrow-up'
                                    "
                                    size="small"
                                    rounded="xl"
                                    :color="hasPreview ? '' : 'primary'"
                                    :variant="hasPreview ? 'text' : 'tonal'"
                                    :loading="loading"
                                    :disabled="!canSubmit"
                                    @click="submit"
                                />
                            </template>
                        </v-tooltip>

                        <div v-if="hasPreview" class="d-flex align-center ga-1">
                            <v-divider vertical class="mx-1 my-2" />

                            <v-tooltip text="Discard" location="bottom">
                                <template #activator="{ props: tooltipProps }">
                                    <v-btn
                                        v-bind="tooltipProps"
                                        variant="text"
                                        icon="ph-x"
                                        size="small"
                                        color="error"
                                        :disabled="loading"
                                        @click="cancel"
                                        rounded="xl"
                                    />
                                </template>
                            </v-tooltip>

                            <v-tooltip
                                text="Insert at cursor"
                                location="bottom"
                            >
                                <template #activator="{ props: tooltipProps }">
                                    <v-btn
                                        v-bind="tooltipProps"
                                        variant="tonal"
                                        icon="ph-check"
                                        size="small"
                                        color="primary"
                                        :disabled="!generatedText || loading"
                                        @click="insert"
                                        rounded="xl"
                                    />
                                </template>
                            </v-tooltip>
                        </div>
                    </div>
                </template>
            </v-text-field>
        </v-card-text>
        <template v-if="hasPreview">
            <v-divider />
            <v-sheet
                color="transparent"
                max-height="min(480px, 60vh)"
                class="overflow-y-auto px-5 py-4"
            >
                <div
                    class="inline-ai-preview-markdown"
                    v-html="renderedPreview"
                />
            </v-sheet>
        </template>
    </v-card>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue';
import { marked, Renderer } from 'marked';

const markdownRenderer = new Renderer();
const escapeHtml = (value) =>
    String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

markdownRenderer.html = ({ text }) => escapeHtml(text);

const props = defineProps({
    loading: {
        type: Boolean,
        default: false,
    },
    generatedText: {
        type: String,
        default: '',
    },
});

const emit = defineEmits(['submit', 'insert', 'cancel']);

const inputRef = ref(null);
const prompt = ref('');

const canSubmit = computed(
    () => prompt.value.trim().length > 0 && !props.loading,
);
const hasPreview = computed(
    () => props.loading || props.generatedText.length > 0,
);
const previewText = computed(() => props.generatedText || 'Generating...');
const renderedPreview = computed(() =>
    marked.parse(previewText.value, {
        async: false,
        breaks: true,
        renderer: markdownRenderer,
    }),
);

const submit = () => {
    const value = prompt.value.trim();

    if (!value || props.loading || !canSubmit.value) {
        return;
    }

    emit('submit', value);
};

const insert = () => {
    if (!props.generatedText || props.loading) {
        return;
    }

    emit('insert');
};

const cancel = () => {
    emit('cancel');
};

const onKeydown = (event) => {
    if (event.key === 'Escape') {
        event.preventDefault();
        cancel();
        return;
    }

    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        submit();
    }
};

const focus = async () => {
    await nextTick();
    inputRef.value?.focus?.();
};

defineExpose({
    focus,
});
</script>

<style scoped>
.inline-ai-preview-markdown {
    overflow-wrap: anywhere;
    line-height: 1.65;
}

.inline-ai-preview-markdown :deep(p) {
    margin-bottom: 0.75rem;
}

.inline-ai-preview-markdown :deep(ul),
.inline-ai-preview-markdown :deep(ol) {
    margin-bottom: 0.75rem;
    padding-left: 1.25rem;
}

.inline-ai-preview-markdown :deep(pre) {
    margin: 0.75rem 0;
    padding: 0.75rem;
    overflow-x: auto;
    border-radius: 8px;
    background: rgba(var(--v-theme-on-surface), 0.08);
}

.inline-ai-preview-markdown :deep(code) {
    font-size: 0.9em;
}

.inline-ai-preview-markdown :deep(:not(pre) > code) {
    padding: 0.1rem 0.3rem;
    border-radius: 4px;
    background: rgba(var(--v-theme-on-surface), 0.08);
}

.inline-ai-preview-markdown :deep(blockquote) {
    margin: 0.75rem 0;
    padding-left: 0.75rem;
    border-left: 3px solid rgba(var(--v-theme-on-surface), 0.24);
    color: rgba(var(--v-theme-on-surface), 0.78);
}

.inline-ai-preview-markdown :deep(> :first-child) {
    margin-top: 0;
}

.inline-ai-preview-markdown :deep(> :last-child) {
    margin-bottom: 0;
}
</style>
