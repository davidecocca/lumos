<template>
    <v-list
    density="compact"
    nav
    mandatory
    select-strategy="single-independent"
    :selected="[currentRoute.name]"
    >
    <v-tooltip
    v-for="item in items"
    :key="item.value"
    :text="item.hint"
    location="right"
    :disabled="!rail || !item.hint"
    >
    <template v-slot:activator="{ props: tooltipProps }">
        <v-list-item
        v-bind="tooltipProps"
        :value="item.value"
        :active="currentRoute.name === item.value"
        @click.stop="openRoute(item.value)"
        >
        <template v-slot:prepend>
            <v-icon 
            :icon="currentRoute.name === item.value ? `${item.icon}-fill` : item.icon"
            ></v-icon>
        </template>
        <template v-slot:title>
            <span :class="{ 'font-weight-bold': currentRoute.name === item.value }">{{ item.title }}</span>
        </template>
        <template v-slot:append>
            <v-hotkey
            v-if="item.hotkey"
            :keys="item.hotkey"
            display-mode="icon"
            variant="text"
            platform="mac"
            />
        </template>
    </v-list-item>
</template>
</v-tooltip>
</v-list>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router'

defineProps({
    rail: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['open-search'])

const items = [
{ icon: 'ph-magnifying-glass', title: 'Search', value: 'search', hint: 'Search (⌘K)', hotkey: 'cmd+k' },
{ icon: 'ph-house', title: 'Home', value: 'home', hint: 'Home' },
{ icon: 'ph-chat-circle', title: 'Chat', value: 'chat', hint: 'Chat (⌘⇧L)', hotkey: 'cmd+shift+l' },
{ icon: 'ph-gear', title: 'Settings', value: 'settings', hint: 'Settings' },
]

const router = useRouter()
const currentRoute = useRoute()

const openRoute = (routeName) => {
    if (routeName === 'search') {
        emit('open-search')
    } else {
        // Use router-link navigation for other routes
        router.push({ name: routeName })
    }
}
</script>

<style scoped></style>
