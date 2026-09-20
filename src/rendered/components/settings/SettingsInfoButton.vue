<template>
    <v-btn
        icon
        variant="text"
        size="small"
        rounded="lg"
        density="comfortable"
        class="text-medium-emphasis"
        :aria-label="title"
        aria-haspopup="dialog"
        @click="open = true"
    >
        <v-icon icon="ph-info" />
        <v-tooltip activator="parent" location="top">
            {{ title }}
        </v-tooltip>
    </v-btn>

    <BaseDialog v-model="open" :title="title" icon="ph-info" max-width="480">
        <div class="d-flex flex-column ga-2 text-body-2">
            <slot />
        </div>
        <template #actions>
            <v-spacer />
            <v-btn color="primary" variant="tonal" @click="open = false">
                Got it
            </v-btn>
        </template>
    </BaseDialog>
</template>

<script setup>
import { ref } from 'vue';
import BaseDialog from '../commons/BaseDialog.vue';

defineProps({
    title: { type: String, required: true },
});

const open = ref(false);
</script>
