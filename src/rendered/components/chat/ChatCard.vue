<template>
    <v-card
    :color="props.message.bgColor"
    :variant="props.message.variant"
    :text="props.message.text"
    >
    <div v-if="props.message.sources !== null && props.message.sources.length > 0">
        <v-card-actions
        style="flex-wrap: wrap;"
        >
        <v-btn
        v-for="(note, index) in message.sources"
        :key="index"
        variant="outlined"
        prepend-icon="mdi-file-document-outline"
        @click="openNote(note.id)"
        class="text-none text-subtitle-2 mr-2"
        >
        {{ note.folderName }} / {{ note.title }}
    </v-btn>
</v-card-actions>
</div>
</v-card>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const props = defineProps({
    message: {
        type: Object,
        required: true
    }
})

// Open the note when the user clicks on the citing
const openNote = (nodeId) => {
    router.push({ name: 'notes', params: { noteId: nodeId } })
}
</script>