<template>
    <div class="d-flex flex-column">
        <!-- Page title -->
        <ViewTitle title="Settings" subtitle="Set things your way." />

        <v-tabs v-model="tab" align-tabs="center" color="primary" class="mb-4">
            <v-tab value="general" prepend-icon="ph-sliders-horizontal">General</v-tab>
            <v-tab value="appearance" prepend-icon="ph-broom">Appearance</v-tab>
            <v-tab value="lumos-ai" prepend-icon="ph-brain">Lumos AI</v-tab>
        </v-tabs>

        <v-tabs-window v-model="tab">
            <v-tabs-window-item value="general">
                <StartupCard />
            </v-tabs-window-item>
            <!-- Appearance settings -->
            <v-tabs-window-item value="appearance">
                <ChangeThemeCard :theme="theme" @update:theme="updateTheme" />
            </v-tabs-window-item>
            <!-- Lumos AI settings -->
            <v-tabs-window-item value="lumos-ai">
                <LumosAICard />
            </v-tabs-window-item>
        </v-tabs-window>
    </div>
</template>

<script setup>
import ViewTitle from '../components/commons/ViewTitle.vue';
import ChangeThemeCard from '../components/settings/ChangeThemeCard.vue';
import LumosAICard from '../components/settings/LumosAICard.vue';
import StartupCard from '../components/settings/StartupCard.vue';

import { computed, ref } from 'vue';

const props = defineProps({
    theme: {
        type: String,
        default: 'light',
        validator: (value) => ['light', 'dark', 'auto'].includes(value),
    },
});

const emit = defineEmits(['update:theme']);

// Tab states
const tab = ref('general');

// Use computed property to access the theme
const theme = computed(() => props.theme);

// Function to emit theme changes to parent
function updateTheme(newTheme) {
    emit('update:theme', newTheme);
}
</script>
