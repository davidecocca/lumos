<!-- This is a simple card component that can be used to display note information -->
<template>
    <v-card
    @click="openNote(props.note.id)"
    style="height: 220px"
    elevation="1"
    class="rounded-md border pa-2"
    rounded="lg"
    >
    <v-card-title class="font-weight-medium">{{ props.note.title }}</v-card-title>
    <v-chip
    class="ml-3"
    color="primary"
    variant="tonal"
    size="small"
    >
    {{ props.note.folder_name }}
</v-chip>

<v-card-item class="mt-2">
    <p class="text-body-2" style="
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    ">{{ props.note.topic || emptyNoteMessage }}</p>
    
    <div class="d-flex flex-column justify-end" style="position: absolute; bottom: 16px;">
        <div class="d-flex align-center" v-if="props.showUpdatedAt">
            <v-icon size="small" class="mr-4">mdi-clock-edit-outline</v-icon>
            <div class="d-flex flex-column">
                <span class="text-body-2">{{ updatedAtParts.date }} {{ updatedAtParts.time }}</span>
            </div>
        </div>
        
        <div class="d-flex align-center" v-if="props.showAccessedAt">
            <v-icon size="small" class="mr-4">mdi-eye-outline</v-icon>
            <div class="d-flex flex-column">
                <span class="text-body-2">{{ lastViewedAtParts.date }} {{ lastViewedAtParts.time }}</span>
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
const emptyNoteMessage = 'No content yet. Click to start writing.'

// Define the props for the component
// The props are used to pass data from the parent component to this component
const props = defineProps({
    note: {
        type: Object,
        required: true,
        prop: {
            id: Number,
            title: String,
            topic: String,
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