<template>
    <v-tooltip :text="tooltipText" location="bottom">
        <template v-slot:activator="{ props: tooltipProps }">
            <span v-bind="tooltipProps" class="d-inline-flex align-center">
                <v-progress-circular
                    v-if="saving"
                    indeterminate
                    :size="14"
                    :width="2"
                    class="text-medium-emphasis"
                />
                <v-icon
                    v-else
                    icon="ph-check"
                    size="x-small"
                    class="text-medium-emphasis"
                />
            </span>
        </template>
    </v-tooltip>
</template>

<script setup>
import { computed } from 'vue';
import { parseTimestamp } from '../../utils/date';

const props = defineProps({
    saving: {
        type: Boolean,
        default: false,
    },
    savedAt: {
        type: [Number, String, Date],
        default: null,
    },
});

const tooltipText = computed(() => {
    if (props.saving) return 'Saving...';
    if (!props.savedAt) return 'Not saved yet';

    const date = parseTimestamp(props.savedAt);

    if (!date) return 'Not saved yet';

    const time = date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });

    if (date.toDateString() === new Date().toDateString()) {
        return `Last saved: ${time}`;
    }

    const day = date.toLocaleDateString([], {
        day: 'numeric',
        month: 'short',
    });
    return `Last saved: ${day}, ${time}`;
});
</script>
