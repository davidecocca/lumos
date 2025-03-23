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
        
        <v-sheet
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
        <NoteCard :note="note" :class="['ma-4']" />
    </v-slide-group-item>
</v-slide-group>
</v-sheet>

</div>
</template>

<script setup>
import NoteCard from './NoteCard.vue';

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
    }
});
</script>