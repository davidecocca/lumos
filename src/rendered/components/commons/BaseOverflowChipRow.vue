<template>
    <div>
        <!-- Row container -->
        <div class="overflow-chip-row d-flex align-center flex-nowrap ga-2">
            <!-- Row icon and tooltip -->
            <v-tooltip :text="label" location="left">
                <template #activator="{ props }">
                    <v-icon
                        v-bind="props"
                        :icon="icon"
                        size="small"
                        class="flex-shrink-0"
                        aria-hidden="true"
                    />
                </template>
            </v-tooltip>

            <!-- Row items and +N overflow -->
            <div
                ref="itemsArea"
                class="overflow-chip-row__items d-flex align-center flex-nowrap flex-1-1-0 ga-2"
            >
                <!-- Empty state and visible chips -->
                <div
                    class="overflow-chip-row__chips d-flex align-center flex-nowrap flex-0-1 ga-2 overflow-hidden"
                >
                    <!-- Show empty text if there are no items -->
                    <span
                        v-if="!items.length"
                        class="text-body-small text-medium-emphasis text-truncate"
                        >{{ emptyText }}</span
                    >

                    <!-- Visible chips -->
                    <v-chip
                        v-for="item in visibleItems"
                        :key="item.key"
                        rounded="lg"
                        size="small"
                        closable
                        class="overflow-chip-row__chip flex-shrink-0 ma-0"
                        :disabled="disabled"
                        v-bind="item.chipProps"
                        v-on="
                            clickable
                                ? { click: () => emit('click', item) }
                                : {}
                        "
                        @click:close="emit('remove', item)"
                        ><span class="text-truncate">{{
                            item.label
                        }}</span></v-chip
                    >
                </div>

                <!-- +N chip and overflow menu -->
                <div
                    v-if="overflowItems.length"
                    class="overflow-chip-row__overflow d-inline-flex flex-shrink-0"
                >
                    <v-menu
                        width="320"
                        max-width="calc(100vw - 32px)"
                        location="top start"
                        offset="8"
                        :close-on-content-click="closeOnContentClick"
                    >
                        <template #activator="{ props }">
                            <v-chip
                                v-bind="props"
                                rounded="lg"
                                size="small"
                                class="flex-shrink-0 ma-0"
                                :disabled="disabled"
                                :aria-label="moreLabel"
                                >+{{ overflowItems.length }}</v-chip
                            >
                        </template>

                        <!-- Overflow heading and items supplied by the parent -->
                        <v-list
                            rounded="lg"
                            density="compact"
                            nav
                            :prepend-gap="8"
                            max-height="300"
                            class="px-1 py-2 overflow-y-auto"
                        >
                            <div
                                class="px-3 py-1 text-body-small text-medium-emphasis"
                            >
                                <slot
                                    name="overflow-label"
                                    :count="overflowItems.length"
                                />
                            </div>
                            <v-divider class="my-1" />
                            <slot name="overflow" :items="overflowItems" />
                        </v-list>
                    </v-menu>
                </div>
            </div>

            <!-- Fixed Add button -->
            <v-btn
                class="ms-auto flex-shrink-0"
                icon="ph-plus"
                variant="text"
                size="x-small"
                density="comfortable"
                rounded
                :disabled="disabled"
                :aria-label="addLabel"
                @click="emit('add')"
            />
        </div>

        <!-- Hidden copies used to measure chip and +N widths -->
        <div
            ref="measureContainer"
            class="overflow-chip-row__measure position-fixed top-0 d-flex ga-2 overflow-visible text-no-wrap"
            aria-hidden="true"
            inert
        >
            <v-chip
                v-for="item in items"
                :key="item.key"
                rounded="lg"
                size="small"
                closable
                class="overflow-chip-row__chip overflow-chip-row__measure-chip flex-shrink-0 ma-0"
            >
                <span class="text-truncate">{{ item.label }}</span>
            </v-chip>
            <span ref="overflowMeasure" class="d-inline-flex flex-shrink-0">
                <v-chip rounded="lg" size="small" class="flex-shrink-0 ma-0"
                    >+{{ items.length }}</v-chip
                >
            </span>
        </div>
    </div>
</template>

<script setup>
import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref,
    watch,
} from 'vue';
import { fittingChipCount } from '../../utils/chipOverflow.js';

const props = defineProps({
    items: { type: Array, required: true },
    label: { type: String, required: true },
    icon: { type: String, required: true },
    emptyText: { type: String, required: true },
    addLabel: { type: String, required: true },
    moreLabel: { type: String, required: true },
    disabled: Boolean,
    clickable: Boolean,
    closeOnContentClick: { type: Boolean, default: true },
});
const emit = defineEmits(['add', 'click', 'remove']);
const itemsArea = ref(null);
const measureContainer = ref(null);
const overflowMeasure = ref(null);
const visibleCount = ref(0);
const visibleItems = computed(() => props.items.slice(0, visibleCount.value));
const overflowItems = computed(() => props.items.slice(visibleCount.value));
let observer;

async function measure() {
    await nextTick();
    if (!itemsArea.value || !measureContainer.value) return;
    const widths = [
        ...measureContainer.value.querySelectorAll(
            '.overflow-chip-row__measure-chip',
        ),
    ].map((element) => element.getBoundingClientRect().width);
    visibleCount.value = fittingChipCount(
        itemsArea.value.getBoundingClientRect().width,
        widths,
        overflowMeasure.value?.getBoundingClientRect().width || 0,
    );
}

watch(() => props.items, measure, { deep: true, flush: 'post' });
onMounted(() => {
    observer = new ResizeObserver(measure);
    observer.observe(itemsArea.value);
    // Observe native elements only: refs inside Vuetify activator slots can mount later.
    // Measuring chips also catches font changes without a sidebar resize.
    observer.observe(measureContainer.value);
    measure();
});
onBeforeUnmount(() => observer?.disconnect());
</script>

<style scoped>
/* Ensure the row and its children can shrink to fit the container. */
.overflow-chip-row,
.overflow-chip-row__items,
.overflow-chip-row__chips {
    min-width: 0;
}
.overflow-chip-row__chip {
    max-width: min(240px, 100%);
}
.overflow-chip-row__chip :deep(.v-chip__content) {
    min-width: 0;
}
/* Hidden copies used to measure chip and +N widths. */
.overflow-chip-row__measure {
    left: -10000px;
    width: max-content;
    visibility: hidden;
    pointer-events: none;
}
</style>
