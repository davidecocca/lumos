<template>
    <v-list
    density="compact"
    nav
    mandatory
    select-strategy="single-independent"
    :selected="[currentRoute.name]"
    >
    <v-fade-transition>
    <v-list-item v-show="!rail" class="pr-0">
        <div class="d-flex justify-end">
            <v-div class="d-flex align-center text-title-large font-weight-bold">
                Lumos
            </v-div>

            <v-spacer></v-spacer>

            <v-tooltip
            v-for="item in quickActions"
            :key="item.action"
            location="bottom"
            :text="item.hint"
            >
            <template v-slot:activator="{ props: tooltipProps }">
                <v-btn
                v-bind="tooltipProps"
                :aria-label="item.title"
                :icon="item.icon"
                variant="text"
                density="comfortable"
                rounded
                color="surface-variant"
                @click.stop="runQuickAction(item.action)"
                />
            </template>
        </v-tooltip>
        </div>
    </v-list-item>
    </v-fade-transition>

    <v-tooltip
    v-for="item in items"
    :key="item.value"
    :text="item.hint"
    location="right"
    :disabled="!rail || !item.hint"
    >
    <template v-slot:activator="{ props: tooltipProps }">
        <v-expand-transition>
        <v-list-item
        v-bind="tooltipProps"
            class="page-router-item"
            :value="item.value"
            :active="currentRoute.name === item.value"
            @click.stop="openRoute(item.value)"
            v-show="rail || !item.showOnlyInRail"
            >
        <template v-slot:prepend>
            <v-icon 
            :icon="currentRoute.name === item.value ? `${item.icon}-fill` : item.icon"
            ></v-icon>
        </template>
        <template v-slot:title>
            <v-fade-transition>
                <span
                v-show="!rail"
                :class="{ 'font-weight-bold': currentRoute.name === item.value }"
                >{{ item.title }}</span>
            </v-fade-transition>
        </template>
        <template v-slot:append>
            <v-fade-transition>
                <span v-show="!rail" class="page-router-hotkey">
                <v-hotkey
                v-if="item.hotkey"
                :keys="item.hotkey"
                display-mode="icon"
                variant="text"
                :platform="hotkeyPlatform"
                />
                </span>
            </v-fade-transition>
        </template>
    </v-list-item>
    </v-expand-transition>
</template>
</v-tooltip>
</v-list>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router'
import { formatShortcut, vHotkeyPlatform } from '../../../utils/shortcuts'

defineProps({
    rail: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['open-search', 'toggle-sidebar'])

const createHint = (item) => item.hintShortcut
    ? `${item.title} (${formatShortcut(item.hintShortcut)})`
    : item.title

const quickActions = [
{ icon: 'ph-magnifying-glass', title: 'Search', action: 'search', hintShortcut: 'cmd+k' },
{ icon: 'ph-sidebar-simple', title: 'Toggle sidebar', action: 'toggle-sidebar', hintShortcut: 'cmd+\\' },
].map(item => ({ ...item, hint: createHint(item) }))

const items = [
{ icon: 'ph-sidebar-simple', title: 'Toggle sidebar', value: 'sidebar', hotkey: 'cmd+\\', hintShortcut: '⌘\\', showOnlyInRail: true },
{ icon: 'ph-magnifying-glass', title: 'Search', value: 'search', hotkey: 'cmd+k', hintShortcut: '⌘K', showOnlyInRail: true },
{ icon: 'ph-house', title: 'Home', value: 'home', showOnlyInRail: false },
{ icon: 'ph-chat-circle', title: 'Chat', value: 'chat', hotkey: 'cmd+shift+l', hintShortcut: '⌘⇧L', showOnlyInRail: false },
{ icon: 'ph-gear', title: 'Settings', value: 'settings', showOnlyInRail: false },
].map(item => ({
    ...item,
    hint: createHint(item),
}))

const router = useRouter()
const currentRoute = useRoute()

const hotkeyPlatform = vHotkeyPlatform()

const openRoute = (routeName) => {
    if (routeName === 'search') {
        emit('open-search')
    } else if (routeName === 'sidebar') {
        emit('toggle-sidebar')
    } else {
        // Use router-link navigation for other routes
        router.push({ name: routeName })
    }
}

const runQuickAction = (action) => {
    if (action === 'search') {
        emit('open-search')
        return
    }

    if (action === 'toggle-sidebar') {
        emit('toggle-sidebar')
    }
}
</script>

<style scoped>
.page-router-hotkey {
    opacity: 0;
    pointer-events: none;
    transition: opacity 120ms ease;
}

.page-router-item:hover .page-router-hotkey,
.page-router-item:focus-within .page-router-hotkey {
    opacity: 1;
}
</style>
