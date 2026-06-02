<template>
    <v-dialog
        :model-value="modelValue"
        :max-width="maxWidth"
        :height="height"
        :persistent="persistent"
        @update:model-value="$emit('update:modelValue', $event)"
    >
        <v-card rounded="xl" :elevation="cardElevation" :class="cardClass">
            <v-card-title
                v-if="hasHeader"
                class="d-flex align-center pt-5 pb-1 px-6"
            >
                <v-avatar
                    v-if="icon"
                    :color="avatarColor || iconColor"
                    :size="avatarSize"
                    :variant="avatarVariant"
                    class="mr-3"
                >
                    <v-icon :size="iconSize" :color="avatarColor ? iconColor : undefined">
                        {{ icon }}
                    </v-icon>
                </v-avatar>
                <div>
                    <div class="text-headline-small">{{ title }}</div>
                    <div v-if="subtitle" class="text-label-large text-medium-emphasis">
                        {{ subtitle }}
                    </div>
                </div>
                <slot name="title-extra" />
            </v-card-title>

            <v-card-text :class="contentClass">
                <slot />
            </v-card-text>

            <template v-if="$slots.actions">
                <v-divider />
                <v-card-actions :class="actionsClass">
                    <slot name="actions" />
                </v-card-actions>
            </template>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    maxWidth: {
        type: [String, Number],
        default: 520
    },
    height: {
        type: [String, Number],
        default: undefined
    },
    persistent: {
        type: Boolean,
        default: false
    },
    title: {
        type: String,
        default: ''
    },
    subtitle: {
        type: String,
        default: ''
    },
    icon: {
        type: String,
        default: ''
    },
    iconColor: {
        type: String,
        default: 'primary'
    },
    avatarColor: {
        type: String,
        default: ''
    },
    iconSize: {
        type: [String, Number],
        default: 24
    },
    avatarSize: {
        type: [String, Number],
        default: 40
    },
    avatarVariant: {
        type: String,
        default: 'tonal'
    },
    cardElevation: {
        type: [String, Number],
        default: 8
    },
    cardClass: {
        type: [String, Array, Object],
        default: undefined
    },
    contentClass: {
        type: String,
        default: 'px-6 pb-4'
    },
    actionsClass: {
        type: String,
        default: 'px-6 py-3'
    }
})

const hasHeader = computed(() => Boolean(props.title || props.subtitle || props.icon))
</script>
