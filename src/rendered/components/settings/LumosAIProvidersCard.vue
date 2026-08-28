<template>
    <v-card
        class="rounded-md border mt-4"
        rounded="lg"
        elevation="0"
        title="Providers"
    >
        <v-card-text>
            <section>
                <div class="text-subtitle-1 font-weight-medium">APIs</div>
                <div class="text-body-2 text-medium-emphasis mt-1">
                    Connect your preferred providers with API keys.
                </div>

                <div class="d-flex flex-column ga-5 mt-4">
                    <div
                        v-for="provider in apiKeyProviders"
                        :key="provider.id"
                        class="d-flex align-start align-sm-center ga-4"
                    >
                        <v-avatar
                            size="48"
                            rounded="lg"
                            class="border flex-shrink-0 align-self-start align-sm-self-end"
                        >
                            <ModelProviderMark
                                :provider="provider.id"
                                size="32"
                            />
                        </v-avatar>
                        <v-text-field
                            :model-value="getApiKey(provider.id)"
                            :type="
                                visibleApiKeys[provider.id]
                                    ? 'text'
                                    : 'password'
                            "
                            :placeholder="`Enter your ${provider.label} API key here`"
                            :append-inner-icon="
                                visibleApiKeys[provider.id]
                                    ? 'ph-eye'
                                    : 'ph-eye-slash'
                            "
                            @update:model-value="setApiKey(provider.id, $event)"
                            @click:append-inner="
                                visibleApiKeys[provider.id] =
                                    !visibleApiKeys[provider.id]
                            "
                            @blur="handleApiKeyBlur(provider)"
                            variant="outlined"
                            density="comfortable"
                            hide-details
                            rounded="lg"
                            class="flex-grow-1"
                            :label="provider.label"
                        />
                    </div>
                </div>
            </section>

            <section class="mt-8">
                <div class="text-subtitle-1 font-weight-medium">
                    ChatGPT / Codex
                </div>
                <div class="text-body-2 text-medium-emphasis mt-1">
                    Use Codex CLI with your ChatGPT subscription.
                </div>

                <v-sheet class="mt-4 pa-4" border rounded="lg">
                    <div class="d-flex align-center ga-4">
                        <v-avatar
                            size="48"
                            rounded="lg"
                            class="border flex-shrink-0"
                        >
                            <ModelProviderMark provider="codex" size="32" />
                        </v-avatar>
                        <div class="flex-grow-1">
                            <div class="text-h6">Codex CLI</div>
                        </div>
                        <v-switch
                            :model-value="aiStore.codexEnabled"
                            :loading="isCheckingCodex"
                            :disabled="isCheckingCodex"
                            color="primary"
                            hide-details
                            inset
                            @update:model-value="toggleCodex"
                        />
                    </div>

                    <v-alert
                        v-if="codexError"
                        type="error"
                        variant="tonal"
                        density="compact"
                        class="mt-4"
                    >
                        {{ codexError }}
                    </v-alert>

                    <div
                        v-if="aiStore.codexEnabled && codexStatus"
                        class="d-flex align-center mt-4 pt-4 border-t"
                    >
                        <div
                            class="d-flex flex-column ga-1 text-body-2 codex-usage"
                        >
                            <div class="codex-usage-row">
                                <v-icon
                                    :icon="usageIcon"
                                    :color="usageColor"
                                    size="small"
                                />
                                <span>5h</span>
                                <span class="font-weight-medium">{{
                                    primaryUsage
                                }}</span>
                                <span class="text-medium-emphasis">{{
                                    primaryReset
                                }}</span>
                            </div>
                            <div class="codex-usage-row">
                                <v-icon
                                    :icon="weeklyUsageIcon"
                                    :color="weeklyUsageColor"
                                    size="small"
                                />
                                <span>Weekly</span>
                                <span class="font-weight-medium">{{
                                    weeklyUsage
                                }}</span>
                                <span class="text-medium-emphasis">{{
                                    weeklyReset
                                }}</span>
                            </div>
                        </div>
                        <v-spacer />
                        <v-btn
                            variant="text"
                            size="small"
                            prepend-icon="ph-arrows-clockwise"
                            :loading="isCheckingCodex"
                            @click="refreshCodexStatus"
                        >
                            Refresh usage
                        </v-btn>
                    </div>
                </v-sheet>
            </section>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import { round } from 'javascript-time-ago/steps';
import { aiPreferencesStore } from '../../stores/aiPreferencesStore';
import { getGroqModels } from '../../services/providers/groqService';
import ModelProviderMark from '../ai/ModelProviderMark.vue';

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo('en-US');
const relativeTimeStyle = { labels: 'narrow', steps: round };

const aiStore = aiPreferencesStore();
const apiKeyProviders = [
    { id: 'openai', label: 'OpenAI' },
    { id: 'groq', label: 'Groq', refreshModels: true },
];
const visibleApiKeys = reactive({
    openai: false,
    groq: false,
});
const isCheckingCodex = ref(false);
const codexError = ref('');
const codexStatus = ref(null);

const primaryRateLimit = computed(
    () => codexStatus.value?.rateLimits?.rateLimits?.primary || null,
);
const primaryUsage = computed(() =>
    primaryRateLimit.value
        ? `${100 - primaryRateLimit.value.usedPercent}%`
        : 'Unavailable',
);
const weeklyRateLimit = computed(
    () => codexStatus.value?.rateLimits?.rateLimits?.secondary || null,
);
const weeklyUsage = computed(() =>
    weeklyRateLimit.value
        ? `${100 - weeklyRateLimit.value.usedPercent}%`
        : 'Unavailable',
);
const getUsageColor = (rateLimit) => {
    const usedPercent = rateLimit?.usedPercent;
    if (typeof usedPercent !== 'number' || usedPercent < 50) return 'success';
    if (usedPercent < 80) return 'warning';
    return 'error';
};
const usageColor = computed(() => getUsageColor(primaryRateLimit.value));
const weeklyUsageColor = computed(() => getUsageColor(weeklyRateLimit.value));
const getUsageIcon = (color) => {
    if (color === 'success') return 'ph-check-circle';
    if (color === 'warning') return 'ph-warning-circle';
    return 'ph-warning';
};
const usageIcon = computed(() => getUsageIcon(usageColor.value));
const weeklyUsageIcon = computed(() => getUsageIcon(weeklyUsageColor.value));
const primaryReset = computed(() =>
    primaryRateLimit.value?.resetsAt
        ? new Date(primaryRateLimit.value.resetsAt * 1000).toLocaleTimeString(
              [],
              { hour: 'numeric', minute: '2-digit' },
          )
        : '',
);
const weeklyReset = computed(() =>
    weeklyRateLimit.value?.resetsAt
        ? timeAgo.format(
              new Date(weeklyRateLimit.value.resetsAt * 1000),
              relativeTimeStyle,
          )
        : '',
);
const refreshCodexStatus = async () => {
    isCheckingCodex.value = true;
    codexError.value = '';
    try {
        const status = await window.api.getCodexStatus();
        codexStatus.value = status;
        aiStore.setCodexEnabled(true, status.models);
    } catch (error) {
        codexError.value = error.message;
        throw error;
    } finally {
        isCheckingCodex.value = false;
    }
};

const toggleCodex = async (enabled) => {
    if (!enabled) {
        aiStore.setCodexEnabled(false);
        codexStatus.value = null;
        codexError.value = '';
        return;
    }

    try {
        await refreshCodexStatus();
    } catch {
        aiStore.setCodexEnabled(false);
    }
};

const refreshGroqModels = async () => {
    const apiKey = aiStore.apiKeys.groq;
    if (!apiKey.trim()) {
        aiStore.updateAvailableModels('groq', []);
        return;
    }

    try {
        aiStore.updateAvailableModels('groq', await getGroqModels(apiKey));
    } catch (error) {
        aiStore.updateAvailableModels('groq', []);
        console.error('Error fetching Groq models:', error);
    }
};

const getApiKey = (provider) => aiStore.apiKeys[provider] || '';
const setApiKey = (provider, value) => {
    const apiKey = value || '';
    aiStore.setApiKey(provider, apiKey);
    if (provider === 'groq' && !apiKey.trim())
        aiStore.updateAvailableModels('groq', []);
};
const handleApiKeyBlur = (provider) => {
    if (provider.refreshModels) refreshGroqModels();
};

onMounted(() => {
    if (aiStore.codexEnabled) {
        refreshCodexStatus().catch(() => aiStore.setCodexEnabled(false));
    }
});
</script>

<style scoped>
.codex-usage {
    min-width: 220px;
}

.codex-usage-row {
    display: grid;
    grid-template-columns: 16px minmax(60px, 1fr) 40px 68px;
    align-items: center;
    column-gap: 8px;
}
</style>
