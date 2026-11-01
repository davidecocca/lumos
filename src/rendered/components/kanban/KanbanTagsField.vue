<template>
    <BaseOverflowChipRow
        :items="items"
        label="Tags"
        icon="ph-tag"
        empty-text="No tags"
        add-label="Add a tag"
        more-label="More tags"
        :disabled="disabled"
        :close-on-content-click="false"
        @add="dialogOpen = true"
        @remove="removeTag($event.key)"
    >
        <!-- Slot for the overflow label -->
        <template #overflow-label="{ count }"
            >{{ count }} more {{ count === 1 ? 'tag' : 'tags' }}</template
        >
        <!-- Slot for the overflow items -->
        <template #overflow="{ items: overflowItems }">
            <v-list-item
                v-for="item in overflowItems"
                :key="item.key"
                rounded="lg"
                min-height="36"
                :disabled="disabled"
            >
                <template #prepend
                    ><v-icon
                        icon="ph-tag"
                        size="18"
                        class="text-medium-emphasis"
                /></template>
                <v-list-item-title
                    class="text-body-small text-truncate"
                    :title="item.label"
                    >{{ item.label }}</v-list-item-title
                >
                <template #append>
                    <v-btn
                        icon
                        v-tooltip:top="'Remove tag'"
                        variant="text"
                        size="x-small"
                        density="comfortable"
                        rounded
                        :disabled="disabled"
                        :aria-label="`Remove ${item.label} tag`"
                        @click.stop="removeTag(item.key)"
                    >
                        <v-icon icon="ph-x-circle" size="18" />
                    </v-btn>
                </template>
            </v-list-item>
        </template>
    </BaseOverflowChipRow>
    <AddTagsDialog
        v-model="dialogOpen"
        v-model:selected-tags="selectedTags"
        :tags="tags"
        :disabled="disabled"
    />
</template>

<script setup>
import { computed, ref } from 'vue';

import BaseOverflowChipRow from '../commons/BaseOverflowChipRow.vue';
import AddTagsDialog from './dialogs/AddTagsDialog.vue';

const selectedTags = defineModel({ type: Array, default: () => [] });
defineProps({ tags: { type: Array, default: () => [] }, disabled: Boolean });
const dialogOpen = ref(false);
const items = computed(() =>
    selectedTags.value.map((tag) => ({
        key: tag,
        label: tag,
    })),
);

function removeTag(tag) {
    selectedTags.value = selectedTags.value.filter((item) => item !== tag);
}
</script>
