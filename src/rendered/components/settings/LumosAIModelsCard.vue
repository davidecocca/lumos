<template>
    <v-card class="rounded-md border" title="Models" subtitle="Your notes, your LLM: stay local or go hosted." rounded="lg" elevation="0">
        <v-card-text class="mt-2">
            <v-select
                v-for="feature in modelFeatures"
                :key="feature.key"
                class="model-select"
                :label="feature.label"
                :items="groupedModelItems"
                :model-value="getSelection(feature.key)"
                variant="outlined"
                density="comfortable"
                rounded="lg"
                @update:model-value="setSelection(feature.key, $event)"
            >
                <template v-slot:item="{ props: itemProps, item }">
                    <v-list-subheader v-if="getSlotItemType(item) === 'subheader'">{{ getSlotItemTitle(item) }}</v-list-subheader>
                    <v-list-item
                        v-else
                        v-bind="itemProps"
                        :title="getSlotItemTitle(item)"
                        :active="isModelSelected(feature.key, getSlotItemValue(item))"
                        color="primary"
                    >
                        <template v-slot:prepend>
                            <ModelProviderMark :provider="getSlotItemProvider(item)" class="me-3" />
                        </template>
                        <template v-slot:append>
                            <span
                                v-if="isModelSelected(feature.key, getSlotItemValue(item)) && getReasoningEfforts(getSlotItemValue(item)).length"
                                class="text-caption text-medium-emphasis me-1"
                            >
                                {{ getReasoningLabel(feature.key, getSlotItemValue(item)) }}
                            </span>
                            <v-menu v-if="getReasoningEfforts(getSlotItemValue(item)).length" location="end">
                                <template v-slot:activator="{ props }">
                                    <v-btn v-bind="props" icon="ph-brain" size="x-small" variant="text" @click.stop />
                                </template>
                                <v-list density="compact">
                                    <v-list-item
                                        v-for="effort in getReasoningEfforts(getSlotItemValue(item))"
                                        :key="effort"
                                        :title="formatReasoningEffort(effort)"
                                        @click.stop="setReasoningEffort(feature.key, getSlotItemValue(item), effort)"
                                    />
                                </v-list>
                            </v-menu>
                        </template>
                    </v-list-item>
                </template>
                <template v-slot:selection="{ item }">
                    <span class="model-selection-label">{{ getSelectionTitle(feature.key, item) }}</span>
                </template>
            </v-select>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { computed } from 'vue';
import { aiPreferencesStore } from '../../stores/aiPreferencesStore';
import { buildModelItems, getProviderTitle, getSlotItemProvider, getSlotItemTitle } from '../../utils/modelProviders';
import ModelProviderMark from '../ai/ModelProviderMark.vue';

const aiStore = aiPreferencesStore();

const modelFeatures = [
    { key: 'editor', label: 'Editor' },
    { key: 'chat', label: 'Chat' },
];

const getSelection = (feature) => ({
    provider: aiStore[feature].provider,
    model: aiStore[feature].model,
});
const isModelSelected = (feature, selection) => {
    const selected = getSelection(feature);
    return selection?.provider === selected.provider && selection?.model === selected.model;
};
const setSelection = (feature, value) => {
    if (!value) return;
    aiStore.setProvider(feature, value.provider);
    aiStore.setModel(feature, value.model);
};

const providers = computed(() => aiStore.availableProviders);
const getProviderModels = (provider) => provider ? aiStore.getProviderModels(provider) : [];
const modelItems = computed(() => buildModelItems(providers.value, getProviderModels));
const groupedModelItems = computed(() => providers.value.flatMap((provider) => {
    const items = modelItems.value.filter((item) => item.value.provider === provider);
    return items.length ? [{ type: 'subheader', title: getProviderTitle(provider) }, ...items] : [];
}));

const getSlotItemType = (item) => item?.raw?.type || item?.type;
const getSlotItemValue = (item) => item?.raw?.value || item?.value;
const getReasoningEfforts = (selection) => {
    if (!selection?.provider || !selection?.model) return [];
    return aiStore.getProviderModels(selection.provider)
        .find((model) => model.value === selection.model)?.supportedReasoningEfforts || [];
};
const formatReasoningEffort = (effort) => effort === 'xhigh'
    ? 'Extra high'
    : effort ? effort.charAt(0).toUpperCase() + effort.slice(1) : 'Default';
const getReasoningLabel = (feature, selection) => formatReasoningEffort(
    aiStore.getModelReasoningEffort(feature, selection.provider, selection.model),
);
const getSelectionTitle = (feature, item) => {
    const selection = getSlotItemValue(item);
    const reasoning = getReasoningEfforts(selection).length
        ? getReasoningLabel(feature, selection)
        : null;
    return [getProviderTitle(selection?.provider), getSlotItemTitle(item), reasoning].filter(Boolean).join(' · ');
};
const setReasoningEffort = (feature, selection, effort) => aiStore.setModelReasoningEffort(feature, selection.provider, selection.model, effort);
</script>

<style scoped>
.model-selection-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.model-select :deep(.v-select__selection) {
    min-width: 0;
    max-width: 100%;
}
</style>
