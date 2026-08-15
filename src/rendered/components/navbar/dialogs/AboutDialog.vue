<template>
    <BaseDialog
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        title="About Lumos"
        subtitle=""
        icon="ph-info"
    >
        <div class="about-content d-flex flex-column align-center ga-2 py-4">
            <v-avatar size="80" rounded="lg">
                <v-img :src="appLogo"></v-img>
            </v-avatar>
            <div class="text-subtitle-1 font-weight-medium">Lumos</div>
            <div class="text-body-2">Version {{ appInfo?.version || '—' }}</div>
            <div class="text-body-2 text-medium-emphasis">Your notes, your way.</div>
        </div>

        <template #actions>
            <v-spacer />
            <v-btn variant="text" @click="$emit('update:modelValue', false)">Close</v-btn>
        </template>
    </BaseDialog>
</template>

<script setup>
import BaseDialog from '../../commons/BaseDialog.vue'
import appLogo from '../../../assets/app_logo.png'

import { onMounted, ref } from 'vue'

defineProps({
    modelValue: {
        type: Boolean,
        default: false,
    },
})

defineEmits(['update:modelValue'])
const appInfo = ref(null)

const loadAppInfo = async () => {
    try {
        appInfo.value = await window.api.getAppInfo()
    } catch (error) {
        console.error('Error loading app info:', error)
    }
}

onMounted(() => {
    loadAppInfo()
})
</script>

<style scoped>
.about-content {
    text-align: center;
}
</style>
