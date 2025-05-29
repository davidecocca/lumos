<template>
    <div class="ma-2">
        <div class="d-flex align-center pa-4">
            <v-icon class="mr-2">{{ icon }}</v-icon>
            <v-tooltip :text="tooltipText" location="right">
                <template v-slot:activator="{ props }">
                    <p class="text-h6" v-bind="props">
                        {{ title }}
                    </p>
                </template>
            </v-tooltip>
        </div>
        
        <EmptyState
        v-if="notes.length === 0"
        :title="emptyStateTitle"
        :text="emptyStateText"
        icon="mdi-package-variant"
        />
        
        <v-sheet
        v-else
        class="mx-auto"
        color="transparent"
        >
        <v-slide-group
        class="pa-2"
        center-active
        show-arrows
        >
        <v-slide-group-item
        v-for="note in notes"
        :key="note.id"
        class="mx-2"
        >
        <NoteCard :note="note" :class="['ma-4']" :showAccessedAt="showAccessedAt" :showUpdatedAt="showUpdatedAt"/>
    </v-slide-group-item>
</v-slide-group>
</v-sheet>

</div>
</template>

<script setup>
import NoteCard from './NoteCard.vue';
import EmptyState from './EmptyState.vue';

const props = defineProps({
    notes: {
        type: Array,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    icon: {
        type: String,
        required: true
    },
    tooltipText: {
        type: String,
        required: true
    },
    theme: {
        type: String,
        default: 'light',
        validator: (value) => ['light', 'dark', 'auto'].includes(value)
    },
    showAccessedAt: {
        type: Boolean,
        default: false
    },
    showUpdatedAt: {
        type: Boolean,
        default: false
    },
    emptyStateTitle: {
        type: String,
        default: 'No notes found'
    },
    emptyStateText: {
        type: String,
        default: 'Start creating notes to see them here.'
    }
});
</script>