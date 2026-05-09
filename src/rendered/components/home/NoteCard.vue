<template>
    <v-card
    elevation="0"
    rounded="lg"
    height="220"
    class="border pa-2 d-flex flex-column"
    @click="openNote(props.note.id)"
    >
    <v-card-item>
        <v-card-title class="d-flex flex-column ga-2">
            <span>{{ props.note.title }}</span>
        </v-card-title>
        
        <template v-slot:append>
            <v-chip
            color="primary"
            variant="tonal"
            size="small"
            rounded="lg"
            prepend-icon="ph-folder"
            >
            {{ props.note.folder_name }}
        </v-chip>
    </template>
</v-card-item>

<v-card-text class="text-medium-emphasis mt-1 h-50 flex-grow-0 note-topic">
    {{ props.note.topic || emptyNoteMessage }}
</v-card-text>

<v-card-actions class="mt-auto">
    <v-chip
    v-if="props.showUpdatedAt"
    variant="text"
    prepend-icon="ph-pencil-simple"
    >
    {{ updatedAtLabel }}
</v-chip>

<v-chip
v-if="props.showAccessedAt"
variant="text"
prepend-icon="ph-clock-counter-clockwise"
>
{{ lastViewedAtLabel }}
</v-chip>
</v-card-actions>

</v-card>
</template>

<script setup>
import { useFoldersStore } from '../../stores/foldersStore'

import { useRouter } from 'vue-router'
import { computed } from 'vue'
import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'
import { round } from 'javascript-time-ago/steps'

const router = useRouter()
const store = useFoldersStore()
const emptyNoteMessage = 'No content yet. Click to start writing.'

TimeAgo.addDefaultLocale(en)
const timeAgo = new TimeAgo('en-US')
const relativeTimeStyle = {
    labels: 'narrow',
    steps: round,
}

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

const parseNoteTimestamp = (value) => {
    if (!value) {
        return null
    }
    
    const normalizedValue = typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? `${value.replace(' ', 'T')}Z`
    : value
    
    const date = new Date(normalizedValue)
    
    if (Number.isNaN(date.getTime())) {
        return null
    }
    
    return date
}

const formatRelativeTime = (value) => {
    const date = parseNoteTimestamp(value)
    
    if (!date) {
        return ''
    }
    
    return timeAgo.format(date, relativeTimeStyle)
}

const updatedAtLabel = computed(() => formatRelativeTime(props.note.updated_at))
const lastViewedAtLabel = computed(() => formatRelativeTime(props.note.last_viewed_at))

const openNote = async (nodeId) => {
    await store.openNote(nodeId, router)
}
</script>

<style scoped>
.note-topic {
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
}
</style>
