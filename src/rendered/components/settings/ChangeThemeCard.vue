<template>
    <div class="ma-2">
        <v-card
        class="rounded-md border ma-2"
        title="Theme"
        subtitle="Customize how Lumos looks on your device."
        rounded="lg"
        elevation="0"
        >
        <v-card-text>
            <v-btn-toggle v-model="localTheme" mandatory color="primary" divided>
                <v-btn value="light">
                    <span class="hidden-sm-and-down">Light</span>
                    <v-icon end>mdi-white-balance-sunny</v-icon>
                </v-btn>
                
                <v-btn value="dark">
                    <span class="hidden-sm-and-down">Dark</span>
                    <v-icon end>mdi-moon-waning-crescent</v-icon>
                </v-btn>
                
                <v-btn value="auto">
                    <span class="hidden-sm-and-down">Auto</span>
                    <v-icon end>mdi-theme-light-dark</v-icon>
                </v-btn>
            </v-btn-toggle>
        </v-card-text>
    </v-card>
</div>
</template>

<script setup>
import { ref, watch } from 'vue'

// Accept current theme from the parent
const props = defineProps({
    theme: {
        type: String,
        default: 'light',
        validator: (value) => ['light', 'dark', 'auto'].includes(value) 
    }
})

// Let parent know when the user changes theme
const emit = defineEmits(['update:theme'])

// Local copy to drive the v-model on the buttons
const localTheme = ref(props.theme)

// Emit new theme whenever a button is clicked
watch(localTheme, (newVal) => {
    emit('update:theme', newVal)
})

// If parent updates prop, keep local value in sync
watch(() => props.theme, (newVal) => {
    localTheme.value = newVal
})
</script>