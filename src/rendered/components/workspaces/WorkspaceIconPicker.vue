<template>
    <v-menu
        v-model="menu"
        location="bottom start"
        :close-on-content-click="false"
        :offset="16"
    >
        <template #activator="{ props }">
            <v-btn
                v-bind="props"
                icon
                :disabled="disabled"
                variant="text"
                rounded="lg"
                aria-label="Choose workspace icon"
            >
                <v-avatar
                    :badge="{
                        color: 'surface',
                        location: 'bottom end',
                        floating: true,
                        bordered: false,
                    }"
                    rounded="lg"
                    variant="tonal"
                    :color="color"
                >
                    <template #badge>
                        <v-icon icon="ph-pencil-simple-line" />
                    </template>
                    <v-icon :icon="modelValue" />
                </v-avatar>
            </v-btn>
        </template>
        <template #default>
            <v-card rounded="lg" width="288" class="pa-3">
                <div
                    class="workspace-color-grid mb-3"
                    role="group"
                    aria-label="Workspace color"
                >
                    <v-btn
                        v-for="item in workspaceColors"
                        :key="item"
                        icon
                        :variant="color === item ? 'tonal' : 'text'"
                        rounded="lg"
                        size="small"
                        :aria-label="`Select ${item} workspace color`"
                        :aria-pressed="color === item"
                        @click="selectColor(item)"
                    >
                        <v-avatar
                            size="18"
                            rounded="xl"
                            variant="flat"
                            :color="item"
                            class="workspace-color-preview"
                        />
                    </v-btn>
                </div>
                <v-divider class="mb-3" />
                <div
                    class="workspace-icon-grid"
                    role="group"
                    aria-label="Workspace icon"
                >
                    <v-btn
                        v-for="item in workspaceIcons"
                        :key="item"
                        :icon="item"
                        :variant="modelValue === item ? 'tonal' : 'text'"
                        rounded="lg"
                        size="small"
                        :aria-label="`Select ${item} workspace icon`"
                        :aria-pressed="modelValue === item"
                        @click="selectIcon(item)"
                    >
                        <v-icon :icon="item"/>
                    </v-btn>
                </div>
            </v-card>
        </template>
    </v-menu>
</template>

<script setup>
import { ref } from 'vue';
import workspaceColors from '../../../shared/workspaceColors.json';
import workspaceIcons from '../../../shared/workspaceIcons.json';

defineProps({
    modelValue: { type: String, default: 'ph-squares-four' },
    color: { type: String, default: 'primary' },
    disabled: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue', 'update:color']);
const menu = ref(false);
const selectIcon = (icon) => {
    emit('update:modelValue', icon);
};
const selectColor = (color) => emit('update:color', color);
</script>

<style scoped>
.workspace-color-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 4px;
    justify-items: center;
}

.workspace-icon-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 4px;
    justify-items: center;
}

.workspace-color-preview {
    filter: saturate(1.25);
}
</style>
