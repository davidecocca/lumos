<template>
    <div class="mr-4 d-flex align-center">
        <img :src="currentIcon" alt="Lumos logo" class="nav-logo" style="width: 48px; height: auto;"/>
    </div>
    <div class="d-flex flex-column justify-center mb-1">
        <span class="text-h6">Lumos</span>
        <span class="subtitle">Your notes, your way.</span>
    </div>
</template>

<script setup>
import { useTheme } from 'vuetify'
import { ref, watch } from 'vue'
import appIconDark from '../../assets/app_icon_dark.png'
import appIconLight from '../../assets/app_icon_light.png'

const theme = useTheme()
const currentIcon = ref(theme.global.name.value === 'dark' ? appIconDark : appIconLight)

// Watch for theme changes
watch(
() => theme.global.name.value,
(newTheme) => {
    currentIcon.value = newTheme === 'dark' ? appIconDark : appIconLight
}
)
</script>

<style scoped>
.nav-logo {
    height: 56px;
}

.subtitle {
    font-size: 0.75rem;
    color: rgba(var(--v-theme-on-surface), 0.6);
    line-height: 1;
    margin-top: 2px;
}
</style>