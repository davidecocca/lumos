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
            :key="item.value || item.action"
            :text="item.hint"
            location="right"
            :disabled="!rail || !!item.action"
        >
            <template v-slot:activator="{ props: tooltipProps }">
                <v-list-item
                    v-bind="tooltipProps"
                    class="page-router-item"
                    :value="item.value || item.action"
                    :active="currentRoute.name === item.value"
                    :style="item.action ? { height: '44px' } : undefined"
                    :link="!item.action || rail"
                    :ripple="!item.action || rail"
                    @click.stop="
                        item.action && rail
                            ? emit('toggle-sidebar')
                            : !item.action && openRoute(item.value)
                    "
                >
                    <template v-slot:prepend v-if="!item.action || rail">
                        <v-icon
                            :icon="
                                currentRoute.name === item.value
                                    ? `${item.icon}-fill`
                                    : item.icon
                            "
                        ></v-icon>
                    </template>
                    <template v-slot:title>
                        <span
                            v-show="!rail"
                            :class="{
                                'font-weight-bold':
                                    item.action ||
                                    currentRoute.name === item.value,
                                'text-title-medium': item.action,
                            }"
                            >{{ item.title }}</span
                        >
                    </template>
                    <template v-slot:append v-if="item.action && !rail">
                        <v-btn
                            :icon="item.icon"
                            variant="text"
                            density="comfortable"
                            rounded
                            color="surface-variant"
                            @click.stop="emit('toggle-sidebar')"
                        />
                    </template>
                    <template v-slot:append v-else>
                        <span v-show="!rail" class="page-router-hotkey">
                            <v-hotkey
                                v-if="item.hotkey"
                                :keys="item.hotkey"
                                display-mode="icon"
                                variant="text"
                                :platform="hotkeyPlatform"
                            />
                        </span>
                    </template>
                </v-list-item>
            </template>
        </v-tooltip>
    </v-list>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router';
import { formatShortcut, vHotkeyPlatform } from '../../../utils/shortcuts';

defineProps({
    rail: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(['open-search', 'toggle-sidebar']);

const createHint = (item) =>
    item.hintShortcut
        ? `${item.title} (${formatShortcut(item.hintShortcut)})`
        : item.title;

const items = [
    {
        icon: 'ph-sidebar-simple',
        title: 'Lumos',
        action: 'toggle-sidebar',
        hintShortcut: 'cmd+\\',
    },
    {
        icon: 'ph-magnifying-glass',
        title: 'Search',
        value: 'search',
        hotkey: 'cmd+k',
        hintShortcut: '⌘K',
    },
    { icon: 'ph-house', title: 'Home', value: 'home' },
    {
        icon: 'ph-chat-circle',
        title: 'Chat',
        value: 'chat',
        hotkey: 'cmd+shift+l',
        hintShortcut: '⌘⇧L',
    },
    { icon: 'ph-gear', title: 'Settings', value: 'settings' },
].map((item) => ({
    ...item,
    hint: createHint(item),
}));

const router = useRouter();
const currentRoute = useRoute();

const hotkeyPlatform = vHotkeyPlatform();

const openRoute = (routeName) => {
    if (routeName === 'search') {
        emit('open-search');
    } else {
        // Use router-link navigation for other routes
        router.push({ name: routeName });
    }
};
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
