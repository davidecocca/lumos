<template>
    <!-- Home menu -->
    <v-list-item
    :active="currentRoute.name === 'home'"
    height="48"
    @click="openHome()"
    >
    <template v-slot:prepend>
        <v-icon 
        :icon="currentRoute.name === 'home' ? 'ph-house-fill' : 'ph-house'"
        ></v-icon>
    </template>
    <template v-slot:title>
        <span :class="{ 'font-weight-bold': currentRoute.name === 'home' }">Home</span>
    </template>
</v-list-item>

<!-- Settings menu -->
<v-list-item
:active="currentRoute.name === 'settings'"
height="48"
@click="openSettings()"
>
<template v-slot:prepend>
    <v-icon 
    :icon="currentRoute.name === 'settings' ? 'ph-gear-fill' : 'ph-gear'"
    ></v-icon>
</template>
<template v-slot:title>
    <span :class="{ 'font-weight-bold': currentRoute.name === 'settings' }">Settings</span>
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
</script>
