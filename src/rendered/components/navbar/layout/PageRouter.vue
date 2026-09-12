<template>
    <v-list
        density="compact"
        :class="rail ? '' : 'pb-2'"
        prepend-gap="8"
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
            :disabled="!rail"
        >
            <template v-slot:activator="{ props: tooltipProps }">
                <v-list-item
                    v-bind="tooltipProps"
                    class="page-router-item"
                    rounded="lg"
                    :value="item.value"
                    :active="currentRoute.name === item.value"
                    @click="openRoute(item.value)"
                >
                    <template v-slot:prepend>
                        <v-icon
                            :icon="
                                currentRoute.name === item.value
                                    ? `${item.icon}-fill`
                                    : item.icon
                            "
                        ></v-icon>
                    </template>
                    <template v-if="!rail" v-slot:title>
                        <span
                            :class="{
                                'font-weight-medium':
                                    currentRoute.name === item.value,
                            }"
                            >{{ item.title }}</span
                        >
                    </template>
                    <template v-if="!rail" v-slot:append>
                        <span class="page-router-hotkey">
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

const emit = defineEmits(['open-search']);

const createHint = (item) =>
    item.hintShortcut
        ? `${item.title} (${formatShortcut(item.hintShortcut)})`
        : item.title;

const items = [
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
