<template>
    <v-card
        class="border chat-input-card align-self-center"
        color="nav-background"
        elevation="0"
        rounded="xl"
        width="calc(100% - 32px)"
        max-width="800"
    >
        <v-card-text class="ps-2 pt-1 pb-0">
            <v-textarea
                :model-value="modelValue"
                placeholder="Ask something"
                hide-details
                rows="1"
                max-rows="5"
                variant="plain"
                auto-grow
                class="ml-2 mr-2"
                @update:model-value="emit('update:modelValue', $event)"
                @keydown.enter="handleInputEnter"
            />
        </v-card-text>

        <v-card-actions
            class="pt-2 pb-2 px-4 d-flex ga-2 align-center flex-nowrap"
        >
            <v-spacer />

            <div
                class="d-flex align-center ga-2 justify-end"
                style="min-width: 0"
            >
                <div class="model-trigger-wrap">
                    <v-menu location="top end" max-height="400">
                        <template v-slot:activator="{ props: menuProps }">
                            <v-tooltip text="Pick model" location="top">
                                <template
                                    v-slot:activator="{ props: tooltipProps }"
                                >
                                    <v-btn
                                        v-bind="
                                            mergeProps(menuProps, tooltipProps)
                                        "
                                        class="model-trigger text-none px-2"
                                        variant="text"
                                        rounded="lg"
                                        size="small"
                                        style="min-width: 0"
                                    >
                                        <span class="model-trigger-label">{{
                                            selectedModelTitle
                                        }}</span>
                                        <v-icon
                                            icon="ph-caret-down"
                                            size="small"
                                            class="ml-2 flex-shrink-0"
                                        />
                                    </v-btn>
                                </template>
                            </v-tooltip>
                        </template>
                        <v-list
                            density="compact"
                            rounded="lg"
                            class="pl-1 pr-1 pt-2 pb-2"
                        >
                            <template
                                v-for="group in groupedModelItems"
                                :key="group.provider"
                            >
                                <v-list-subheader>{{
                                    group.title
                                }}</v-list-subheader>
                                <v-list-item
                                    v-for="item in group.items"
                                    :key="`${item.value.provider}-${item.value.model}`"
                                    rounded="lg"
                                    :active="isModelSelected(item.value)"
                                    color="primary"
                                    @click="emit('select-model', item.value)"
                                >
                                    <template v-slot:prepend>
                                        <ModelProviderMark
                                            :provider="item.value.provider"
                                            class="me-3"
                                        />
                                    </template>
                                    <v-list-item-title class="text-no-wrap">
                                        {{ item.title }}
                                    </v-list-item-title>
                                    <template v-slot:append>
                                        <span
                                            v-if="
                                                isModelSelected(item.value) &&
                                                item.supportedReasoningEfforts
                                                    ?.length
                                            "
                                            class="text-caption text-medium-emphasis me-1"
                                        >
                                            {{ getReasoningLabel(item.value) }}
                                        </span>
                                        <v-menu
                                            v-if="
                                                item.supportedReasoningEfforts
                                                    ?.length
                                            "
                                            location="end"
                                        >
                                            <template
                                                v-slot:activator="{ props }"
                                            >
                                                <v-btn
                                                    v-bind="props"
                                                    icon="ph-brain"
                                                    size="x-small"
                                                    variant="text"
                                                    @click.stop
                                                />
                                            </template>
                                            <v-list density="compact">
                                                <v-list-item
                                                    v-for="effort in item.supportedReasoningEfforts"
                                                    :key="effort"
                                                    :title="
                                                        formatReasoningEffort(
                                                            effort,
                                                        )
                                                    "
                                                    @click.stop="
                                                        setReasoningEffort(
                                                            item.value,
                                                            effort,
                                                        )
                                                    "
                                                />
                                            </v-list>
                                        </v-menu>
                                    </template>
                                </v-list-item>
                            </template>
                        </v-list>
                    </v-menu>
                </div>

                <v-tooltip text="Send (⏎)" location="top">
                    <template v-slot:activator="{ props: activatorProps }">
                        <v-btn
                            v-bind="activatorProps"
                            class="flex-shrink-0"
                            icon
                            rounded="pill"
                            variant="tonal"
                            color="primary"
                            size="small"
                            @click="emit('send')"
                        >
                            <v-icon icon="ph-arrow-up" />
                        </v-btn>
                    </template>
                </v-tooltip>
            </div>
        </v-card-actions>
    </v-card>
</template>

<script setup>
import { computed, mergeProps } from 'vue';
import ModelProviderMark from '../ai/ModelProviderMark.vue';
import { aiPreferencesStore } from '../../stores/aiPreferencesStore';
import { getProviderTitle } from '../../utils/modelProviders';

const aiStore = aiPreferencesStore();

const props = defineProps({
    modelValue: {
        type: String,
        default: '',
    },
    modelItems: {
        type: Array,
        default: () => [],
    },
    selectedModel: {
        type: Object,
        default: null,
    },
    selectedModelTitle: {
        type: String,
        default: 'Model',
    },
});

const emit = defineEmits(['update:modelValue', 'send', 'select-model']);

const isModelSelected = (modelValue) => {
    return (
        modelValue.provider === props.selectedModel?.provider &&
        modelValue.model === props.selectedModel?.model
    );
};

const groupedModelItems = computed(() => {
    const groups = new Map();
    for (const item of props.modelItems) {
        const provider = item.value.provider;
        if (!groups.has(provider)) {
            groups.set(provider, {
                provider,
                title: getProviderTitle(provider),
                items: [],
            });
        }
        groups.get(provider).items.push(item);
    }
    return [...groups.values()];
});

const formatReasoningEffort = (effort) =>
    effort === 'xhigh'
        ? 'Extra high'
        : effort.charAt(0).toUpperCase() + effort.slice(1);

const setReasoningEffort = (modelValue, effort) => {
    aiStore.setModelReasoningEffort(
        'chat',
        modelValue.provider,
        modelValue.model,
        effort,
    );
};

const getReasoningLabel = (modelValue) =>
    formatReasoningEffort(
        aiStore.getModelReasoningEffort(
            'chat',
            modelValue.provider,
            modelValue.model,
        ),
    );

const handleInputEnter = (event) => {
    if (event.shiftKey) return;

    event.preventDefault();
    emit('send');
};
</script>

<style scoped>
.chat-input-card {
    flex-shrink: 0;
    margin-inline: 16px;
    margin-bottom: 16px;
}

.model-trigger {
    min-width: 0;
    max-width: 100%;
}

.model-trigger-wrap {
    max-width: min(280px, 100%);
    flex: 0 1 auto;
    min-width: 0;
}

.model-trigger :deep(.v-btn__content) {
    min-width: 0;
    flex-wrap: nowrap;
}

.model-trigger-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
