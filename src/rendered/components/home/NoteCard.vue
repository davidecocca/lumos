<!-- This is a simple card component that can be used to display note information -->
<template>
    <v-card
    :title="props.note.title"
    :subtitle="props.note.folder"
    :text="truncatedContent"
    prepend-icon="mdi-file-document-outline"
    @click="openNote(props.note.title)"
    style="height: 200px;"
    >
</v-card>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

// Define the props for the component
// The props are used to pass data from the parent component to this component
const props = defineProps({
    note: {
        type: Object,
        required: true,
        prop: {
            title: String,
            content: String,
            favorite: Boolean,
            folder: String,
            id: Number
        }
    }
})

// Truncate the content to the firt 50 characters
const truncatedContent = props.note.content.length > 50 ? props.note.content.substring(0, 50) + '...' : props.note.content

// Open the note when the card is clicked by using the router
const openNote = (noteTitle) => {
    router.push({ name: 'notes', params: { title: noteTitle } })
}
</script>