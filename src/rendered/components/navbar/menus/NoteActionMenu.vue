<template>
    <v-menu
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    >
    <template v-slot:activator="{ props }">
        <v-tooltip text="More" :location="tooltipLocation">
            <template v-slot:activator="{ props: tooltipProps }">
                <v-btn
                v-show="visible"
                v-bind="{ ...props, ...tooltipProps }"
                :class="buttonClass"
                icon="ph-dots-three"
                :size="buttonSize"
                variant="text"
                :density="buttonDensity"
                ></v-btn>
            </template>
        </v-tooltip>
    </template>
    <v-list density="compact" rounded="lg" class="pl-1 pr-1 pt-2 pb-2">
        <v-list-item
        v-for="item in menuItems"
        :key="item.title"
        :class="item.class"
        :base-color="item.baseColor"
        @click="item.action"
        rounded="lg"
        >
        <template v-slot:append>
            <v-icon :icon="item.icon"></v-icon>
        </template>
        <v-list-item-title>{{ item.title }}</v-list-item-title>
    </v-list-item>
</v-list>
</v-menu>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    note: {
        type: Object,
        required: true
    },
    visible: {
        type: Boolean,
        default: false
    },
    modelValue: {
        type: Boolean,
        default: false
    },
    buttonSize: {
        type: String,
        default: 'small'
    },
    buttonDensity: {
        type: String,
        default: 'compact'
    },
    buttonClass: {
        type: [String, Array, Object],
        default: ''
    },
    tooltipLocation: {
        type: String,
        default: 'top'
    }
})

const emit = defineEmits([
    'update:modelValue',
    'toggle-favorite',
    'rename-note',
    'move-note',
    'delete-note'
])

const currentFolderId = computed(() => props.note.folder_id ?? props.note.folderId ?? null)

const menuItems = computed(() => {
    const isFavorite = props.note.favorite == 1
    
    return [
    {
        title: isFavorite ? 'Unfavorite' : 'Favorite',
        icon: isFavorite ? 'ph-heart-break' : 'ph-heart',
        action: () => emit('toggle-favorite', props.note.id)
    },
    {
        title: 'Rename',
        icon: 'ph-pencil-simple-line',
        action: () => emit('rename-note', props.note.id, props.note.title)
    },
    {
        title: 'Move',
        icon: 'ph-file-arrow-up',
        action: () => emit('move-note', props.note.id, currentFolderId.value)
    },
    {
        title: 'Delete',
        icon: 'ph-trash',
        class: 'delete-menu-action',
        baseColor: 'error',
        action: () => emit('delete-note', props.note.id)
    }
    ]
})
</script>
