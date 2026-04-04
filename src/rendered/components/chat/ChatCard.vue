<template>
    <v-card
    :color="props.message.bgColor"
    :variant="props.message.variant"
    :text="props.message.text"
    rounded="lg"
    >
    <div v-if="props.message.sources !== null && props.message.sources.length > 0">
        <v-card-actions
        style="flex-direction: column; align-items: flex-start; gap: 8px;"
        >
        <v-chip
        v-for="(note, index) in message.sources"
        :key="index"
        variant="outlined"
        prepend-icon="ph-file-text"
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
    const props = defineProps({
        message: {
            type: Object,
            required: true
        }
    })

    const emit = defineEmits(['open-source'])
    
    // Open the note when the user clicks on the citing
    const openNote = (nodeId) => {
        emit('open-source', nodeId)
    }
</script>
