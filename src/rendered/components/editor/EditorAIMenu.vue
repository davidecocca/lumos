<template>
    <v-list
        density="compact"
        rounded="lg"
        nav
        class="pl-1 pr-1 pt-2 pb-2 bg-surface-dark"
    >
        <v-list-item
            v-for="item in editMenuItems"
            :key="item.value"
            @click="emit(item.event)"
            rounded="lg"
        >
            <template v-slot:prepend>
                <v-icon :icon="item.icon"></v-icon>
            </template>
            <v-list-item-title>{{ item.label }}</v-list-item-title>
        </v-list-item>

        <v-menu open-on-hover location="end" offset="-10">
            <template v-slot:activator="{ props }">
                <v-list-item v-bind="props" rounded="lg">
                    <template v-slot:prepend>
                        <v-icon icon="ph-sliders-horizontal"></v-icon>
                    </template>
                    <template v-slot:append>
                        <v-icon icon="ph-caret-right"></v-icon>
                    </template>
                    <v-list-item-title>Change tone to</v-list-item-title>
                </v-list-item>
            </template>
            <v-list
                density="compact"
                nav
                style="min-width: 180px"
                rounded="lg"
                class="pl-1 pr-1 pt-2 pb-2 bg-surface-dark"
            >
                <v-list-item
                    v-for="tone in supportedTones"
                    :key="tone.key"
                    @click="emit('change-tone', tone.key)"
                    rounded="lg"
                >
                    <template v-slot:prepend>
                        <v-icon :icon="tone.icon"></v-icon>
                    </template>
                    <v-list-item-title>{{ tone.label }}</v-list-item-title>
                </v-list-item>
            </v-list>
        </v-menu>

        <v-menu open-on-hover location="end" offset="-10">
            <template v-slot:activator="{ props }">
                <v-list-item v-bind="props" rounded="lg">
                    <template v-slot:prepend>
                        <v-icon icon="ph-translate"></v-icon>
                    </template>
                    <template v-slot:append>
                        <v-icon icon="ph-caret-right"></v-icon>
                    </template>
                    <v-list-item-title>Translate to</v-list-item-title>
                </v-list-item>
            </template>
            <v-list
                density="compact"
                nav
                style="min-width: 160px"
                rounded="lg"
                class="pl-1 pr-1 pt-2 pb-2 bg-surface-dark"
            >
                <v-list-item
                    v-for="lang in supportedLanguages"
                    :key="lang.key"
                    @click="emit('translate-to', lang.key)"
                    rounded="lg"
                >
                    <v-list-item-title class="d-flex align-center">
                        <span style="margin-right: 32px; font-size: 24px">{{
                            lang.icon
                        }}</span
                        >{{ lang.label }}
                    </v-list-item-title>
                </v-list-item>
            </v-list>
        </v-menu>
    </v-list>
</template>

<script setup>
const editMenuItems = [
    {
        value: 'make-shorter',
        label: 'Summarize',
        icon: 'ph-sort-descending',
        event: 'make-shorter',
    },
    {
        value: 'make-longer',
        label: 'Expand',
        icon: 'ph-sort-ascending',
        event: 'make-longer',
    },
    {
        value: 'simplify',
        label: 'Simplify language',
        icon: 'ph-feather',
        event: 'simplify',
    },
];

defineProps({
    supportedTones: {
        type: Array,
        default: () => [],
    },
    supportedLanguages: {
        type: Array,
        default: () => [],
    },
});

const emit = defineEmits([
    'make-shorter',
    'make-longer',
    'simplify',
    'change-tone',
    'translate-to',
]);
</script>
