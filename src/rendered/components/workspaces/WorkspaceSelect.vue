<template>
    <v-select
        :model-value="modelValue"
        :items="workspaces"
        item-title="name"
        item-value="id"
        :label="label"
        :disabled="disabled"
        variant="outlined"
        density="comfortable"
        rounded="lg"
        hide-details="auto"
        :menu-props="{ contentClass: 'rounded-lg', maxHeight: 320 }"
        :list-props="{
            nav: true,
            density: 'compact',
            class: 'pa-2',
            prependGap: 8,
        }"
        no-data-text="No other workspaces yet. Create one first."
        @update:model-value="emit('update:modelValue', $event)"
    >
        <template #selection="{ item }">
            <WorkspaceAvatar
                :workspace="item"
                :size="24"
                class="me-2 flex-shrink-0"
            />
            <span class="text-truncate">{{ item.name }}</span>
        </template>
        <template #item="{ item, props }">
            <v-list-item v-bind="props" rounded="lg">
                <template #prepend>
                    <WorkspaceAvatar :workspace="item" :size="28" />
                </template>
                <template #append>
                    <v-icon
                        v-if="item.id === modelValue"
                        icon="ph-check"
                        size="18"
                        class="mr-1"
                    />
                </template>
            </v-list-item>
        </template>
    </v-select>
</template>

<script setup>
import WorkspaceAvatar from './WorkspaceAvatar.vue';

defineProps({
    modelValue: { type: String, default: null },
    workspaces: { type: Array, default: () => [] },
    label: { type: String, default: 'Workspace' },
    disabled: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue']);
</script>
