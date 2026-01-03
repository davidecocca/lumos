<template>
    <!-- Logo with app title -->
    <v-list-item
    class="mb-1"
    >
    <template v-slot:prepend>
        <v-avatar
        image="../assets/lumos_logo.png"
        rounded="0"
        size="24"
        />
    </template>
    <template v-slot:title>
        <span class="font-weight-medium text-h5">Lumos</span>
    </template>
</v-list-item>

<!-- Home menu -->
<v-list-item
:active="currentRoute.name === 'home'"
class="mb-1"
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

<!-- Settings menu -->
<v-list-item
:active="currentRoute.name === 'settings'"
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
</script>
