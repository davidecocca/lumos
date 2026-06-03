<template>
    <v-menu>
        <template v-slot:activator="{ props }">
            <v-btn
                v-bind="props"
                class="w-100 bubble-menu-btn"
                variant="text"
                :prepend-icon="icon"
                rounded="lg"
                density="compact"
            >
                {{ label }}
            </v-btn>
        </template>

        <v-card class="palette-menu d-flex align-center ga-2 pa-2 rounded-lg elevation-4 bg-surface-dark">
            <v-btn
                v-for="(color, index) in colors"
                :key="index"
                :style="{ backgroundColor: color.displayedColor }"
                :class="buttonClass"
                variant="flat"
                rounded="circle"
                @click="emit('select', color.value)"
            >
            </v-btn>
        </v-card>
    </v-menu>
</template>

<script setup>
defineProps({
    label: {
        type: String,
        required: true,
    },
    icon: {
        type: String,
        required: true,
    },
    colors: {
        type: Array,
        default: () => [],
    },
    buttonClass: {
        type: String,
        default: 'color-btn',
    },
})

const emit = defineEmits(['select'])
</script>

<style scoped>
.bubble-menu-btn {
    height: 36px;
    min-height: 36px;
}

.palette-menu {
    width: max-content;
}

.color-btn.v-btn,
.text-color-btn.v-btn {
    width: 26px;
    height: 26px;
    min-width: 26px;
    padding: 0;
}

.color-btn:hover,
.text-color-btn:hover {
    transform: scale(1.1);
    transition: transform 0.2s;
}
</style>
