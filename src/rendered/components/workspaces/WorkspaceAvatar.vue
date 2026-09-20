<template>
    <v-avatar
        :size="size"
        rounded="lg"
        variant="tonal"
        :color="workspace?.color || 'primary'"
    >
        <v-icon :icon="workspace?.icon || 'ph-squares-four'" :size="iconSize" />
    </v-avatar>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    workspace: { type: Object, default: null },
    size: { type: [Number, String], default: 32 },
});

const iconSize = computed(() =>
    typeof props.size === 'number' ? Math.round(props.size * 0.56) : 18,
);
</script>
