<template>
    <v-card
        class="border"
        elevation="0"
        rounded="xl"
        color="surface-dark"
    >
        <v-card-text class="d-flex align-center ga-1 pa-2">
            <v-tooltip text="Discard" location="bottom">
                <template #activator="{ props: tooltipProps }">
                    <v-btn
                        v-bind="tooltipProps"
                        icon="ph-x"
                        size="small"
                        color="error"
                        variant="text"
                        rounded="xl"
                        @click="reject"
                    />
                </template>
            </v-tooltip>

            <v-tooltip text="Apply changes" location="bottom">
                <template #activator="{ props: tooltipProps }">
                    <v-btn
                        v-bind="tooltipProps"
                        icon="ph-check"
                        color="primary"
                        variant="tonal"
                        size="small"
                        rounded="xl"
                        :disabled="!editedText || loading"
                        @click="apply"
                    />
                </template>
            </v-tooltip>
        </v-card-text>
    </v-card>
</template>

<script setup>
const props = defineProps({
    loading: {
        type: Boolean,
        default: false,
    },
    editedText: {
        type: String,
        default: '',
    },
});

const emit = defineEmits(['apply', 'reject']);

const apply = () => {
    if (!props.editedText || props.loading) {
        return;
    }

    emit('apply');
};

const reject = () => {
    emit('reject');
};
</script>
