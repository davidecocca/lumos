<template>
    <div class="d-flex flex-column">
        <div class="d-flex flex-column align-center mt-2 mb-4">
            <p class="text-headline-large font-weight-medium ma-0">Settings</p>
            <p class="text-headline-small font-weight-light ma-0 mt-1">Set things your way.</p>
        </div>
        
        <v-tabs
        v-model="tab"
        align-tabs="center"
        color="primary"
        class="mb-4"
        >
        <v-tab :value="appearanceTab">Appearance</v-tab>
        <v-tab :value="lumosAITab">Lumos AI</v-tab>
    </v-tabs>
    
    <v-tabs-window v-model="tab">
        <!-- Appearance settings -->
        <v-tabs-window-item>
            <ChangeThemeCard
            :theme="theme"
            @update:theme="updateTheme"
            />
        </v-tabs-window-item>
        <!-- Lumos AI settings -->
        <v-tabs-window-item>
            <LumosAICard />
        </v-tabs-window-item>
    </v-tabs-window>
</div>
</template>

<script setup>
import ChangeThemeCard from '../components/settings/ChangeThemeCard.vue';
import LumosAICard from '../components/settings/LumosAICard.vue';

import { computed, ref } from 'vue';

const props = defineProps({
    theme: {
        type: String,
        default: 'light',
        validator: (value) => ['light', 'dark', 'auto'].includes(value)
    }
});

const emit = defineEmits(['update:theme']);

// Tab states
const tab = ref('appearanceTab')

// Use computed property to access the theme
const theme = computed(() => props.theme);

// Function to emit theme changes to parent
function updateTheme(newTheme) {
    emit('update:theme', newTheme);
}
</script>
