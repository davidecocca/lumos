<template>
    <!-- Home menu -->
    <v-list-item
    :active="currentRoute.name === 'home'"
    class="ma-1"
    rounded="lg"
    @click="openHome()"
    >
    <template v-slot:prepend>
        <v-icon 
        :icon="currentRoute.name === 'home' ? 'mdi-home' : 'mdi-home-outline'"
        ></v-icon>
    </template>
    <template v-slot:title>
        <span :class="{ 'font-weight-bold': currentRoute.name === 'home' }">Home</span>
    </template>
</v-list-item>

<!-- AI menu -->
<v-list-item
:active="currentRoute.name === 'lumos-ai'"
class="ma-1"
rounded="lg"
@click="openLumosAI()"
>
<template v-slot:prepend>
    <v-icon 
    :icon="currentRoute.name === 'lumos-ai' ? 'mdi-lightning-bolt' : 'mdi-lightning-bolt-outline'"
    ></v-icon>
</template>
<template v-slot:title>
    <span :class="{ 'font-weight-bold': currentRoute.name === 'lumos-ai' }">Lumos AI</span>
</template>
</v-list-item>

<!-- Settings menu -->
<v-list-item
:active="currentRoute.name === 'settings'"
class="ma-1"
rounded="lg"
@click="openSettings()"
>
<template v-slot:prepend>
    <v-icon 
    :icon="currentRoute.name === 'settings' ? 'mdi-cog' : 'mdi-cog-outline'"
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
    
    const openLumosAI = () => {
        router.push({ name: 'lumos-ai' })
    }
</script>
