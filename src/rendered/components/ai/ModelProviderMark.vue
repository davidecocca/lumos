<template>
    <span class="model-provider-mark d-inline-flex align-center justify-center">
        <img
        v-if="providerLogo"
        :src="providerLogo"
        :alt="`${provider} logo`"
        :class="['model-provider-logo', getProviderLogoClass(provider)]"
        >
        <v-icon
        v-else
        :icon="providerIcon"
        size="small"
        class="text-medium-emphasis"
        />
    </span>
</template>

<script setup>
import { computed } from 'vue'
import { getProviderIcon, getProviderLogo, getProviderLogoClass } from '../../utils/modelProviders'

const props = defineProps({
    provider: {
        type: String,
        default: null,
    },
})

const providerLogo = computed(() => getProviderLogo(props.provider))
const providerIcon = computed(() => getProviderIcon(props.provider))
</script>

<style scoped>
.model-provider-mark {
    width: 20px;
    min-width: 20px;
}

.model-provider-logo {
    width: 16px;
    height: 16px;
    display: block;
    object-fit: contain;
    opacity: 0.8;
}

.model-provider-logo--groq {
    transform: translateX(-1px);
}

.v-theme--dark .model-provider-logo {
    filter: brightness(0) invert(1);
    opacity: 0.95;
}
</style>
