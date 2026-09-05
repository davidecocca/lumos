<template>
    <v-card
        elevation="0"
        rounded="xl"
        width="calc(100vw - 48px)"
        max-width="600"
        color="surface-dark"
        border
    >
        <v-card-text class="pt-0 pb-0 pr-2">
            <v-text-field
                ref="inputRef"
                v-model="prompt"
                variant="text"
                density="comfortable"
                rounded="lg"
                hide-details
                autofocus
                single-line
                placeholder="Tell AI how to edit..."
                prepend-icon="ph-sparkle"
                :disabled="loading"
                @keydown="onKeydown"
            >
                <template #append-inner>
                    <div class="d-flex ga-1">
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
                                    :color="hasPreview ? '' : 'primary'"
                                    :variant="hasPreview ? 'text' : 'tonal'"
                                    :loading="loading"
                                    :disabled="!canSubmit"
                                    @click="submit"
                                />
                            </template>
                        </v-tooltip>

                        <div v-if="hasPreview" class="d-flex ga-1">
                            <v-divider vertical class="mx-1" />

                            <v-tooltip text="Discard" location="bottom">
                                <template #activator="{ props: tooltipProps }">
                                    <v-btn
                                        v-bind="tooltipProps"
                                        icon="ph-x"
                                        size="small"
                                        color="error"
                                        variant="text"
                                        rounded="xl"
                                        :disabled="loading"
                                        @click="reject"
                                    />
                                </template>
                            </v-tooltip>

                            <v-tooltip text="Apply changes" location="bottom">
                                <template #activator="{ props: tooltipProps }">
                                    <v-btn
                                        v-bind="tooltipProps"
                                        icon="ph-check"
                                        color="primary"
                                        variant="tonal"
                                        size="small"
                                        rounded="xl"
                                        :disabled="!editedText || loading"
                                        @click="apply"
                                    />
                                </template>
                            </v-tooltip>
                        </div>
                    </div>
                </template>
            </v-text-field>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue';

const props = defineProps({
    loading: {
        type: Boolean,
        default: false,
    },
    editedText: {
        type: String,
        default: '',
    },
});

const emit = defineEmits(['submit', 'apply', 'reject']);

const inputRef = ref(null);
const prompt = ref('');

const hasPreview = computed(() => props.loading || props.editedText.length > 0);
const canSubmit = computed(
    () => prompt.value.trim().length > 0 && !props.loading,
);

const submit = () => {
    const value = prompt.value.trim();

    if (!value || props.loading) {
        return;
    }

    emit('submit', value);
};

const apply = () => {
    if (!props.editedText || props.loading) {
        return;
    }

    emit('apply');
};

const reject = () => {
    if (props.loading) {
        return;
    }

    emit('reject');
};

const onKeydown = (event) => {
    if (event.key === 'Escape') {
        event.preventDefault();
        reject();
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
