<template>
    <div class="d-flex flex-column">
        <div class="d-flex flex-column align-center">
            <p class="text-h4">Settings</p>
        </div>
        
        <!-- Theme settings -->
        <ChangeThemeCard
        :theme="theme"
        @update:theme="updateTheme"
        />
        
        <!-- Lumos AI settings -->
        <LumosAICard />
    </div>
</template>

<script setup>
import ChangeThemeCard from '../components/settings/ChangeThemeCard.vue';
import LumosAICard from '../components/settings/LumosAICard.vue';

import { computed } from 'vue';

const props = defineProps({
    theme: {
        type: String,
        default: 'light',
        validator: (value) => ['light', 'dark', 'auto'].includes(value)
    }
});

const emit = defineEmits(['update:theme']);

// Use computed property to access the theme
const theme = computed(() => props.theme);

// Function to emit theme changes to parent
function updateTheme(newTheme) {
    emit('update:theme', newTheme);
}
</script>