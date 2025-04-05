<!-- This is a simple card component that can be used to display note information -->
<template>
    <v-card
    :title="props.note.title"
    :subtitle="props.note.folder_name"
    @click="openNote(props.note.id)"
    style="width: 200px; height: 200px"
    elevation="1"
    class="rounded-md border ptb-1"
    >
    <template v-slot:append>
        <v-icon icon="mdi-file-document-outline" size="x-large"></v-icon>
    </template>
    
    <v-card-item>
        <div style="height: 100px" class="d-flex flex-column justify-center">
            <div class="d-flex align-center" v-if="props.showUpdatedAt">
                <v-icon size="small" class="mr-4">mdi-clock-edit-outline</v-icon>
                <div class="d-flex flex-column">
                    <span class="text-body-2">{{ updatedAtParts.date }}</span>
                    <span class="text-body-2">{{ updatedAtParts.time }}</span>
                </div>
            </div>
            
            <div class="d-flex align-center" v-if="props.showAccessedAt">
                <v-icon size="small" class="mr-4">mdi-eye-outline</v-icon>
                <div class="d-flex flex-column">
                    <span class="text-body-2">{{ lastViewedAtParts.date }}</span>
                    <span class="text-body-2">{{ lastViewedAtParts.time }}</span>
                </div>
            </div>
        </div>
    </v-card-item>
</v-card>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { computed } from 'vue'

const router = useRouter()

// Define the props for the component
// The props are used to pass data from the parent component to this component
const props = defineProps({
    note: {
        type: Object,
        required: true,
        prop: {
            id: Number,
            title: String,
            favorite: Boolean,
            folder_name: String,
            updated_at: String,
            last_viewed_at: String,
        }
    },
    showUpdatedAt: {
        type: Boolean,
        default: false
    },
    showAccessedAt: {
        type: Boolean,
        default: false
    },
})

// Split updated_at and last_viewed_at into date and time using computed properties
const updatedAtParts = computed(() => {
    const [date, time] = props.note.updated_at.split(' ')
    return { date, time }
})

const lastViewedAtParts = computed(() => {
    const [date, time] = props.note.last_viewed_at.split(' ')
    return { date, time }
})

// Open the note when the card is clicked by using the router
const openNote = (nodeId) => {
    router.push({ name: 'notes', params: { noteId: nodeId } })
}
</script>