<template>
    <!-- Home menu -->
    <v-list-item
    title="Home"
    :active="currentRoute.name === 'home'"
    :class="{ 'selected-menu-item': currentRoute.name === 'home' }"
    class="ma-1"
    rounded="lg"
    @click="openHome()"
    >
        <template v-slot:prepend>
            <v-icon 
                :color="currentRoute.name === 'home' ? 'primary' : ''"
                icon="mdi-home"
            ></v-icon>
        </template>
    </v-list-item>
    
    <!-- AI menu -->
    <v-list-item
    title="Lumos AI"
    :active="currentRoute.name === 'lumos-ai'"
    :class="{ 'selected-menu-item': currentRoute.name === 'lumos-ai' }"
    class="ma-1"
    rounded="lg"
    @click="openLumosAI()"
    >
        <template v-slot:prepend>
            <v-icon 
                :color="currentRoute.name === 'lumos-ai' ? 'primary' : ''"
                icon="mdi-lightning-bolt"
            ></v-icon>
        </template>
    </v-list-item>
    
    <!-- Settings menu -->
    <v-list-item
    title="Settings"
    :active="currentRoute.name === 'settings'"
    :class="{ 'selected-menu-item': currentRoute.name === 'settings' }"
    class="ma-1"
    rounded="lg"
    @click="openSettings()"
    >
        <template v-slot:prepend>
            <v-icon 
                :color="currentRoute.name === 'settings' ? 'primary' : ''"
                icon="mdi-cog"
            ></v-icon>
        </template>
    </v-list-item>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const currentRoute = useRoute()

const openHome = () => {
    router.push({ name: 'home' })
}

const openSettings = () => {
    router.push({ name: 'settings' })
}

const openLumosAI = () => {
    router.push({ name: 'lumos-ai' })
}
</script>

<style scoped>
.selected-menu-item {
    background: rgba(255, 255, 255, 0.6) !important;
    box-shadow: none !important;
    border: none !important;
}

.selected-menu-item:hover {
    background: rgba(255, 255, 255, 0.7) !important;
}

/* Override Vuetify's default active styles */
.v-list-item--active {
    background: rgba(255, 255, 255, 0.6) !important;
}

.v-list-item--active:hover {
    background: rgba(255, 255, 255, 0.7) !important;
}
</style>