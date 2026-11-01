<template>
    <v-menu :location="location">
        <template #activator="{ props }">
            <v-btn
                v-bind="props"
                v-tooltip:bottom="showEdit ? null : 'More'"
                icon="ph-dots-three"
                variant="text"
                rounded="lg"
                density="comfortable"
                :size="buttonSize"
                :disabled="disabled"
                :aria-label="label"
                @click="showEdit && $event.stopPropagation()"
                @keydown="showEdit && $event.stopPropagation()"
            />
        </template>
        <v-list density="compact" rounded="lg" class="px-1 py-2">
            <v-list-item
                v-for="item in menuItems"
                :key="item.key"
                :title="item.title"
                :append-icon="item.icon"
                :base-color="item.baseColor"
                rounded="lg"
                :disabled="item.disabled"
                @click="item.action"
            />
        </v-list>
    </v-menu>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    label: { type: String, default: 'More' },
    location: { type: String, default: undefined },
    buttonSize: { type: String, default: 'default' },
    showEdit: Boolean,
    disabled: Boolean,
    actionsDisabled: Boolean,
    deleteDisabled: Boolean,
    canMoveUp: Boolean,
    canMoveDown: Boolean,
});
const emit = defineEmits(['edit', 'duplicate', 'move', 'delete']);
const menuItems = computed(() => [
    ...(props.showEdit
        ? [
              {
                  key: 'edit',
                  title: 'Edit',
                  icon: 'ph-pencil-simple',
                  action: () => emit('edit'),
              },
          ]
        : []),
    {
        key: 'duplicate',
        title: 'Duplicate',
        icon: 'ph-copy',
        disabled: props.actionsDisabled,
        action: () => emit('duplicate'),
    },
    {
        key: 'move-up',
        title: 'Move up',
        icon: 'ph-arrow-up',
        disabled: props.actionsDisabled || !props.canMoveUp,
        action: () => emit('move', -1),
    },
    {
        key: 'move-down',
        title: 'Move down',
        icon: 'ph-arrow-down',
        disabled: props.actionsDisabled || !props.canMoveDown,
        action: () => emit('move', 1),
    },
    {
        key: 'delete',
        title: 'Delete',
        icon: 'ph-trash',
        baseColor: 'error',
        disabled: props.deleteDisabled,
        action: () => emit('delete'),
    },
]);
</script>
