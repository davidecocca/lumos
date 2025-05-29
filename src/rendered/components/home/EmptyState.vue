<template>
    <v-empty-state
    :title="props.title"
    :text="props.text"
    >
    <template v-slot:media>
        <v-icon color="surface-variant" size="x-large">mdi-package-variant</v-icon>
    </template>
</v-empty-state>
</template>

<script setup>
const props = defineProps({
    title: {
        type: String,
        default: 'No content available'
    },
    text: {
        type: String,
        default: 'There is nothing to show here yet. Start creating notes to see them here.'
    },
})
</script>