<template>
    <div class="d-flex flex-row align-center justify-center ai-actions bubble-menu-row">
        <template
            v-for="(button, index) in quickActionButtons"
            :key="button.value"
        >
            <div class="flex-grow-1 bubble-menu-action" style="flex-basis: 0;">
                <v-tooltip :text="button.tooltip" location="bottom">
                    <template v-slot:activator="{ props }">
                        <v-btn
                            v-bind="props"
                            class="w-100 bubble-menu-btn"
                            variant="text"
                            :prepend-icon="button.icon"
                            rounded="lg"
                            density="compact"
                            @click="emit(button.event)"
                        >
                            {{ button.label }}
                        </v-btn>
                    </template>
                </v-tooltip>
            </div>
            <v-divider vertical class="mx-2"></v-divider>
        </template>

        <div class="flex-grow-1 bubble-menu-action" style="flex-basis: 0;">
            <v-menu>
                <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" class="w-100 bubble-menu-btn" variant="text" prepend-icon="ph-caret-down" rounded="lg" density="compact">Other</v-btn>
                </template>
                <v-list density="compact" rounded="lg" nav class="pl-1 pr-1 pt-2 pb-2 bg-surface-dark">
                    <v-list-subheader>Edit</v-list-subheader>
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

                    <v-list-subheader>Tone</v-list-subheader>
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
                        <v-list density="compact" nav style="min-width: 180px;" rounded="lg" class="pl-1 pr-1 pt-2 pb-2 bg-surface-dark">
                            <v-list-item v-for="tone in supportedTones" :key="tone.key" @click="emit('change-tone', tone.key)" rounded="lg">
                                <template v-slot:prepend>
                                    <v-icon :icon="tone.icon"></v-icon>
                                </template>
                                <v-list-item-title>{{ tone.label }}</v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-menu>

                    <v-list-subheader>Translate</v-list-subheader>
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
                        <v-list density="compact" nav style="min-width: 160px;" rounded="lg" class="pl-1 pr-1 pt-2 pb-2 bg-surface-dark">
                            <v-list-item v-for="lang in supportedLanguages" :key="lang.key" @click="emit('translate-to', lang.key)" rounded="lg">
                                <v-list-item-title class="d-flex align-center">
                                    <span style="margin-right: 32px; font-size: 24px;">{{ lang.icon }}</span>{{ lang.label }}
                                </v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-menu>
                </v-list>
            </v-menu>
        </div>
    </div>
</template>

<script setup>
const quickActionButtons = [
    {
        value: 'edit',
        label: 'Edit',
        tooltip: 'Edit with AI',
        icon: 'ph-pencil-simple',
        event: 'edit',
    },
    {
        value: 'fix-grammar',
        label: 'Fix',
        tooltip: 'Fix spelling & grammar',
        icon: 'ph-text-aa',
        event: 'fix-grammar',
    },
    {
        value: 'format-text',
        label: 'Format',
        tooltip: 'Format text with AI',
        icon: 'ph-text-t',
        event: 'format-text',
    },
]

const editMenuItems = [
    {
        value: 'improve-writing',
        label: 'Improve writing',
        icon: 'ph-pencil-simple',
        event: 'improve-writing',
    },
    {
        value: 'make-shorter',
        label: 'Summarize',
        icon: 'ph-text-align-left',
        event: 'make-shorter',
    },
    {
        value: 'make-longer',
        label: 'Expand',
        icon: 'ph-text-align-justify',
        event: 'make-longer',
    },
    {
        value: 'simplify',
        label: 'Simplify language',
        icon: 'ph-text-aa',
        event: 'simplify',
    },
]

defineProps({
    supportedTones: {
        type: Array,
        default: () => [],
    },
    supportedLanguages: {
        type: Array,
        default: () => [],
    },
})

const emit = defineEmits([
    'edit',
    'fix-grammar',
    'format-text',
    'improve-writing',
    'make-shorter',
    'make-longer',
    'simplify',
    'change-tone',
    'translate-to',
])
</script>

<style scoped>
.ai-actions {
    flex-wrap: nowrap;
    overflow-x: auto;
}

.ai-actions .v-btn {
    width: 100%;
}

.bubble-menu-row {
    min-height: 36px;
}

.bubble-menu-action,
.bubble-menu-btn {
    height: 36px;
}

.bubble-menu-btn {
    min-height: 36px;
}

</style>
