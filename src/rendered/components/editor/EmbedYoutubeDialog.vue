<template>
    <v-dialog
    :model-value="modelValue"
    @update:model-value="onDialogModelUpdate"
    max-width="640"
    >
    <v-card rounded="xl" elevation="8">
        <v-card-title class="d-flex align-center pt-5 pb-1 px-6">
            <v-avatar color="red-lighten-4" size="36" class="mr-3">
                <v-icon size="24" color="red-darken-2">ph-youtube-logo</v-icon>
            </v-avatar>
            <div>
                <div class="text-headline-small">Embed YouTube video</div>
                <div class="text-label-large text-medium-emphasis">Paste a YouTube URL to insert an embedded player.</div>
            </div>
            <v-spacer />
        </v-card-title>

        <v-card-text class="px-6 pb-4">
            <v-text-field
            v-model="youtubeUrl"
            label="YouTube URL"
            placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            variant="outlined"
            clearable
            autofocus
            :error-messages="urlError ? [urlError] : []"
            @keydown.enter="submitEmbed"
            />
        </v-card-text>

        <v-divider />
        <v-card-actions class="px-6 py-3">
            <span class="text-body-small text-medium-emphasis">Supported: youtube.com, youtu.be, music.youtube.com</span>
            <v-spacer />
            <v-btn variant="text" @click="closeDialog">Close</v-btn>
            <v-btn
            color="primary"
            prepend-icon="ph-youtube-logo"
            :disabled="!youtubeUrl.trim()"
            @click="submitEmbed"
            >
            Embed
        </v-btn>
    </v-card-actions>
</v-card>
</v-dialog>
</template>

<script setup>
    import { ref, watch } from 'vue'

    const props = defineProps({
        modelValue: {
            type: Boolean,
            default: false,
        },
    })

    const emit = defineEmits(['update:modelValue', 'embed'])

    const youtubeUrl = ref('')
    const urlError = ref('')

    const isValidYoutubeUrl = (value) => {
        try {
            const url = new URL(value.trim())
            const hostname = url.hostname.replace(/^www\./, '')

            return [
                'youtube.com',
                'youtu.be',
                'music.youtube.com',
            ].includes(hostname)
        } catch {
            return false
        }
    }

    const resetState = () => {
        youtubeUrl.value = ''
        urlError.value = ''
    }

    const onDialogModelUpdate = (value) => {
        emit('update:modelValue', value)
    }

    const closeDialog = () => {
        resetState()
        emit('update:modelValue', false)
    }

    const submitEmbed = () => {
        const normalizedUrl = youtubeUrl.value.trim()

        if (!isValidYoutubeUrl(normalizedUrl)) {
            urlError.value = 'Enter a valid YouTube URL.'
            return
        }

        emit('embed', { src: normalizedUrl })
        closeDialog()
    }

    watch(youtubeUrl, () => {
        if (urlError.value) {
            urlError.value = ''
        }
    })

    watch(() => props.modelValue, (isOpen) => {
        if (!isOpen) {
            resetState()
        }
    })
</script>
