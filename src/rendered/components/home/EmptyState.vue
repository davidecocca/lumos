<template>
    <v-empty-state
    :title="props.title"
    class="text-center"
    width="400px"
    >
    <template #media>
        <v-avatar size="48" variant="text">
            <v-icon :icon="props.icon" size="32"></v-icon>
        </v-avatar>
    </template>
    
    <template v-slot:text>
        <div class="text-medium-emphasis text-body-medium">
            {{ props.text }}
        </div>
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
        default: 'ph-note'
    }
})
</script>
