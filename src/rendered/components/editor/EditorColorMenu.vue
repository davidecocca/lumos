<template>
    <v-list
        density="compact"
        nav
        rounded="lg"
        min-width="180"
        class="pl-1 pr-1 pt-2 pb-2 bg-surface-dark"
    >
        <v-list-item
            v-for="(color, index) in colors"
            :key="index"
            rounded="lg"
            @click="emit('select', color.value)"
        >
            <template v-slot:prepend>
                <v-avatar
                    size="24"
                    rounded="lg"
                    :style="{ backgroundColor: color.displayedColor }"
                    no-border
                    class="mr-4"
                />
            </template>

            <v-list-item-title>{{ color.name }}</v-list-item-title>
        </v-list-item>
    </v-list>
</template>

<script setup>
defineProps({
    colors: {
        type: Array,
        default: () => [],
    },
})

const emit = defineEmits(['select'])
</script>
