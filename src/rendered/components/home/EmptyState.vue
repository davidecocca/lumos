<template>
        <v-empty-state
            :title="props.title"
            :text="props.text"
            class="rounded-xl border pa-8 text-center"
            rounded="xl"
        >
        <template #media>
            <v-avatar size="72" variant="tonal" color="primary" class="mb-4">
                <v-icon :icon="props.icon" size="42"></v-icon>
            </v-avatar>
        </template>

        <template #actions>
            <slot name="actions" />
        </template>
    </v-empty-state>
</template>

<script setup>
const props = defineProps({
    title: {
        type: String,
        default: 'Nothing here yet'
    },
    text: {
        type: String,
        default: 'Start creating notes to see them here.'
    },
    icon: {
        type: String,
        default: 'mdi-text-box-outline'
    }
})
</script>