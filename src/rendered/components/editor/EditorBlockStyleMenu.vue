<template>
    <v-menu min-width="200px" width="200px">
        <template v-slot:activator="{ props }">
            <v-btn
                v-bind="props"
                class="w-100 bubble-menu-btn"
                variant="text"
                prepend-icon="ph-caret-down"
                rounded="lg"
                density="compact"
            >
                Style
            </v-btn>
        </template>

        <v-list density="compact" nav rounded="lg" class="pl-1 pr-1 pt-2 pb-2 bg-surface-dark">
            <v-list-subheader>Turn into</v-list-subheader>
            <v-list-item
                v-for="item in blockItems"
                :key="item.label"
                @click="item.action"
                rounded="lg"
            >
                <template v-slot:prepend>
                    <v-icon :icon="item.icon"></v-icon>
                </template>
                <v-list-item-title>{{ item.label }}</v-list-item-title>
            </v-list-item>
            <v-list-item @click="emit('insert-details')" rounded="lg">
                <template v-slot:prepend>
                    <v-icon icon="ph-caret-right"></v-icon>
                </template>
                <v-list-item-title>Details</v-list-item-title>
            </v-list-item>
            <v-list-item v-if="canRemoveDetails()" @click="emit('remove-details')" rounded="lg">
                <template v-slot:prepend>
                    <v-icon icon="ph-minus-circle"></v-icon>
                </template>
                <v-list-item-title>Remove details</v-list-item-title>
            </v-list-item>
        </v-list>
    </v-menu>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    editor: {
        type: Object,
        required: true,
    },
    canRemoveDetails: {
        type: Function,
        required: true,
    },
})

const emit = defineEmits(['insert-details', 'remove-details'])

const blockItems = computed(() => [
    {
        label: 'Paragraph',
        icon: 'ph-paragraph',
        action: () => props.editor.commands.setParagraph(),
    },
    {
        label: 'Heading 1',
        icon: 'ph-text-h-one',
        action: () => props.editor.commands.toggleHeading({ level: 1 }),
    },
    {
        label: 'Heading 2',
        icon: 'ph-text-h-two',
        action: () => props.editor.commands.toggleHeading({ level: 2 }),
    },
    {
        label: 'Heading 3',
        icon: 'ph-text-h-three',
        action: () => props.editor.commands.toggleHeading({ level: 3 }),
    },
    {
        label: 'Bullet list',
        icon: 'ph-list-bullets',
        action: () => props.editor.commands.toggleBulletList(),
    },
    {
        label: 'Numbered list',
        icon: 'ph-list-numbers',
        action: () => props.editor.commands.toggleOrderedList(),
    },
    {
        label: 'Task list',
        icon: 'ph-list-checks',
        action: () => props.editor.commands.toggleTaskList(),
    },
    {
        label: 'Quote',
        icon: 'ph-quotes',
        action: () => props.editor.commands.toggleBlockquote(),
    },
    {
        label: 'Code block',
        icon: 'ph-code',
        action: () => props.editor.commands.toggleCodeBlock(),
    },
])
</script>

<style scoped>
.bubble-menu-btn {
    height: 36px;
    min-height: 36px;
}
</style>
