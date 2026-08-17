<template>
    <span class="d-inline-flex align-center justify-center" :style="markStyle">
        <img
        v-if="providerLogo"
        :src="providerLogo"
        :alt="`${provider} logo`"
        :class="['model-provider-logo', getProviderLogoClass(provider)]"
        :style="logoStyle"
        >
        <v-icon
        v-else
        :icon="providerIcon"
        :size="size"
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
    size: {
        type: [Number, String],
        default: 20,
    },
})

const providerLogo = computed(() => getProviderLogo(props.provider))
const providerIcon = computed(() => getProviderIcon(props.provider))
const markStyle = computed(() => ({
    width: `${props.size}px`,
    minWidth: `${props.size}px`,
}))
const logoStyle = computed(() => ({
    width: `${props.size}px`,
    height: `${props.size}px`,
}))
</script>

<style scoped>
.model-provider-logo {
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
