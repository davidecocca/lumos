<template>
    <!-- Home menu -->
    <v-list-item
    title="Home"
    prepend-icon="mdi-home"
    @click="openHome()"
    ></v-list-item>
    
    <!-- AI menu -->
    <v-list-item
    title="Lumos AI"
    prepend-icon="mdi-lightning-bolt"
    @click="openLumosAI()"
    ></v-list-item>
    
    <!-- Settings menu -->
    <v-list-item
    title="Settings"
    prepend-icon="mdi-cog"
    @click="openSettings()"
    ></v-list-item>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

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