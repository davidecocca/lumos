<template>
    <v-card
    :color="props.message.bgColor"
    :variant="props.message.variant"
    :text="props.message.text"
    />
</template>

<script setup>

const props = defineProps({
    message: {
        type: Object,
        required: true
    }
})

</script>