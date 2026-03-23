<template>
    <v-dialog
    v-model="dialogOpen"
    max-width="760"
    scrollable
    >
    <v-card class="search-dialog-card" rounded="xl" elevation="0">
        <v-card-text class="pa-4 pa-sm-5">
            <div class="d-flex align-center ga-3 mb-4">
                <div class="search-dialog-icon">
                    <v-icon icon="ph-magnifying-glass" size="20" />
                </div>
                <div>
                    <p class="text-h6 font-weight-medium ma-0">Search</p>
                </div>
            </div>
            
            <v-text-field
            ref="searchField"
            v-model="searchQuery"
            autofocus
            clearable
            @click:clear="clearSearch"
            hide-details
            variant="solo-filled"
            rounded="xl"
            flat
            placeholder="Search notes by title, topic, content, or meaning..."
            prepend-inner-icon="ph-magnifying-glass"
            class="mb-8"
            />
            
            <div class="d-flex align-center justify-space-between mb-2">
                <span class="text-caption text-medium-emphasis">
                    {{ sectionTitle }}
                </span>
                <v-progress-circular
                v-if="isLoading"
                indeterminate
                size="18"
                width="2"
                color="primary"
                />
            </div>
            
            <v-list
            class="search-results-list"
            lines="three"
            density="comfortable"
            rounded="xl"
            >
            <v-list-item
            v-for="note in visibleNotes"
            :key="note.id"
            rounded="xl"
            class="mb-1"
            @click="openNote(note.id)"
            >
            <template v-slot:prepend>
                <v-icon :icon="getMatchIcon(note.match_type)" />
            </template>
            
            <template v-slot:title>
                <span class="font-weight-medium">{{ note.title }}</span>
            </template>
            
            <template v-slot:subtitle>
                <div class="d-flex flex-column ga-2 mt-1">
                    <span class="search-result-summary text-body-2 text-medium-emphasis">
                        {{ note.topic || emptyStateSummary }}
                    </span>
                    <div class="d-flex align-center ga-2 flex-wrap">
                        <v-chip size="x-small" variant="tonal" color="primary">
                            {{ note.folder_name || 'Unfiled' }}
                        </v-chip>
                        <v-chip
                        v-if="searchQuery.trim()"
                        size="x-small"
                        variant="outlined"
                        >
                        {{ getMatchLabel(note.match_type) }}
                    </v-chip>
                </div>
            </div>
        </template>
    </v-list-item>
    
    <div
    v-if="!isLoading && visibleNotes.length === 0"
    class="search-empty-state"
    >
    <v-icon
    :icon="searchQuery.trim() ? 'ph-file-magnifying-glass' : 'ph-clock-counter-clockwise'"
    size="28"
    class="mb-3 text-medium-emphasis"
    />
    <p class="text-body-1 font-weight-medium ma-0">
        {{ searchQuery.trim() ? 'No matching notes' : 'No recent notes yet' }}
    </p>
    <p class="text-body-2 text-medium-emphasis ma-0 mt-1">
        {{ searchQuery.trim() ? 'Try a different keyword or phrase.' : 'Open a note and it will appear here.' }}
    </p>
</div>
</v-list>
</v-card-text>
</v-card>
</v-dialog>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { useFoldersStore } from '../../stores/foldersStore'

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false,
    }
})

const emit = defineEmits(['update:modelValue'])

const store = useFoldersStore()
const router = useRouter()

const dialogOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value),
})

const searchField = ref(null)
const searchQuery = ref('')
const searchResults = ref([])
const isLoading = ref(false)
const emptyStateSummary = 'No content yet.'

let searchTimeout = null
let searchRequestId = 0

const visibleNotes = computed(() => {
    if (!searchQuery.value.trim()) {
        return store.recentNotes.slice(0, 10)
    }
    
    return searchResults.value
})

const sectionTitle = computed(() => {
    const query = searchQuery.value.trim()
    
    if (!query) {
        return 'Recent notes'
    }
    
    if (isLoading.value) {
        return 'Searching notes...'
    }
    
    return searchResults.value.length === 1 ? '1 result' : `${searchResults.value.length} results`
})

const focusSearchField = async () => {
    await nextTick()
    searchField.value?.focus?.()
    searchField.value?.$el?.querySelector('input')?.focus?.()
}

const resetSearchState = () => {
    searchQuery.value = ''
    searchResults.value = []
    isLoading.value = false
}

const clearSearch = async () => {
    searchRequestId += 1
    if (searchTimeout) {
        clearTimeout(searchTimeout)
        searchTimeout = null
    }
    resetSearchState()
    await focusSearchField()
}

const performSearch = async (query) => {
    const requestId = ++searchRequestId
    
    if (!query) {
        searchResults.value = []
        isLoading.value = false
        return
    }
    
    isLoading.value = true
    
    try {
        const results = await store.searchNotes(query, { limit: 10, includeSemantic: true })
        if (requestId !== searchRequestId) return
        searchResults.value = results
    } catch (err) {
        if (requestId !== searchRequestId) return
        console.error('Error searching notes:', err)
        searchResults.value = []
    } finally {
        if (requestId === searchRequestId) {
            isLoading.value = false
        }
    }
}

const openNote = async (noteId) => {
    await store.openNote(noteId, router)
    dialogOpen.value = false
}

const getMatchIcon = (matchType) => {
    if (matchType === 'hybrid') return 'ph-sparkle'
    if (matchType === 'semantic') return 'ph-brain'
    if (matchType === 'keyword') return 'ph-magnifying-glass'
    return 'ph-clock-counter-clockwise'
}

const getMatchLabel = (matchType) => {
    if (matchType === 'hybrid') return 'Keyword + semantic'
    if (matchType === 'semantic') return 'Semantic'
    return 'Keyword'
}

watch(dialogOpen, async (isOpen) => {
    if (isOpen) {
        await store.fetchLastViewedNotes()
        await focusSearchField()
        return
    }
    
    searchRequestId += 1
    if (searchTimeout) {
        clearTimeout(searchTimeout)
        searchTimeout = null
    }
    resetSearchState()
})

watch(searchQuery, (value) => {
    if (searchTimeout) {
        clearTimeout(searchTimeout)
    }
    
    const normalizedQuery = value.trim()
    if (!normalizedQuery) {
        searchRequestId += 1
        searchResults.value = []
        isLoading.value = false
        return
    }
    
    searchTimeout = setTimeout(() => {
        performSearch(normalizedQuery)
    }, 180)
})

onBeforeUnmount(() => {
    if (searchTimeout) {
        clearTimeout(searchTimeout)
    }
})
</script>

<style scoped>
.search-dialog-card {
    border: 1px solid rgba(100, 116, 139, 0.16);
}

.search-dialog-icon {
    width: 40px;
    height: 40px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(59, 130, 246, 0.12);
    color: rgb(37, 99, 235);
    flex-shrink: 0;
}

.search-results-list {
    max-height: min(58vh, 560px);
    overflow-y: auto;
    background: transparent;
}

.search-result-summary {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.search-empty-state {
    min-height: 220px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 24px 12px;
}
</style>
