<template>
    <BaseDialog
        :model-value="modelValue"
        @update:model-value="onDialogModelUpdate"
        max-width="640"
        title="Embed YouTube video"
        subtitle="Paste a YouTube URL to insert an embedded player."
        icon="ph-youtube-logo"
    >
        <template #title-extra>
            <v-spacer />
        </template>

        <v-text-field
            v-model="youtubeUrl"
            label="YouTube URL"
            placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            variant="outlined"
            density="comfortable"
            clearable
            autofocus
            :error-messages="urlError ? [urlError] : []"
            @click:clear="resetState"
            @keydown.enter="submitEmbed"
        />

        <template #actions>
            <span class="text-body-small text-medium-emphasis"
                >Supported: youtube.com, youtu.be, music.youtube.com</span
            >
            <v-spacer />
            <v-btn variant="text" @click="closeDialog"> Close </v-btn>
            <v-btn
                color="primary"
                variant="tonal"
                :disabled="!canEmbed"
                @click="submitEmbed"
            >
                Embed
            </v-btn>
        </template>
    </BaseDialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import BaseDialog from '../../commons/BaseDialog.vue';

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(['update:modelValue', 'embed']);

const youtubeUrl = ref('');
const urlError = ref('');

const normalizedYoutubeUrl = computed(() =>
    String(youtubeUrl.value || '').trim(),
);
const canEmbed = computed(() => normalizedYoutubeUrl.value.length > 0);

const isValidYoutubeUrl = (value) => {
    try {
        const url = new URL(value.trim());
        const hostname = url.hostname.replace(/^www\./, '');

        return ['youtube.com', 'youtu.be', 'music.youtube.com'].includes(
            hostname,
        );
    } catch {
        return false;
    }
};

const resetState = () => {
    youtubeUrl.value = '';
    urlError.value = '';
};

const onDialogModelUpdate = (value) => {
    emit('update:modelValue', value);
};

const closeDialog = () => {
    resetState();
    emit('update:modelValue', false);
};

const submitEmbed = () => {
    const normalizedUrl = normalizedYoutubeUrl.value;

    if (!isValidYoutubeUrl(normalizedUrl)) {
        urlError.value = 'Enter a valid YouTube URL.';
        return;
    }

    emit('embed', { src: normalizedUrl });
    closeDialog();
};

watch(youtubeUrl, () => {
    if (urlError.value) {
        urlError.value = '';
    }
});

watch(
    () => props.modelValue,
    (isOpen) => {
        if (!isOpen) {
            resetState();
        }
    },
);
</script>
