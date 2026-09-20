<template>
    <div class="d-flex flex-column align-center mb-4">
        <p class="text-headline-medium font-weight-medium ma-0">{{ title }}</p>
        <p class="text-title-large font-weight-light ma-0 mt-1">
            {{ subtitle }}
        </p>
    </div>
</template>

<script setup>
const props = defineProps({
    title: {
        type: String,
        required: true,
    },
    subtitle: {
        type: String,
        required: true,
    },
});
</script>
