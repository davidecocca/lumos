<template>
    <BaseDialog
        v-model="open"
        title="Add tags"
        subtitle="Choose an existing tag or create a new one"
        icon="ph-tag"
        :max-width="480"
    >
        <v-combobox
            v-model="entry"
            v-model:menu="menuOpen"
            :items="tags"
            label="Search or create a tag"
            hide-details
            multiple
            clearable
            hide-selected
            :return-object="false"
            variant="outlined"
            density="comfortable"
            rounded="lg"
            :disabled="disabled"
            :menu-props="{ contentClass: 'rounded-lg' }"
            :list-props="{
                nav: true,
                density: 'compact',
                class: 'px-1 py-2',
                rounded: 'lg',
            }"
            :item-props="() => ({ rounded: 'lg' })"
            @update:model-value="addTag"
        />
        <div v-if="selectedTags.length" class="mt-3 d-flex flex-wrap ga-2">
            <v-chip
                v-for="tag in selectedTags"
                :key="tag"
                size="small"
                rounded="lg"
                closable
                max-width="100%"
                :disabled="disabled"
                :title="tag"
                @click:close="removeTag(tag)"
            >
                <span class="text-truncate">{{ tag }}</span>
            </v-chip>
        </div>
        <template #actions>
            <span class="text-body-small text-medium-emphasis"
                >Tip: type a new tag and press Enter to add it.</span
            >
            <v-spacer />
            <v-btn variant="tonal" color="primary" @click="open = false"
                >Done</v-btn
            >
        </template>
    </BaseDialog>
</template>

<script setup>
import { ref } from 'vue';
import BaseDialog from '../../commons/BaseDialog.vue';
import { addCommittedTags } from '../utils/cards.js';

const open = defineModel({ type: Boolean, default: false });
const selectedTags = defineModel('selectedTags', { type: Array, default: () => [] });
defineProps({ tags: { type: Array, default: () => [] }, disabled: Boolean });
const entry = ref([]);
const menuOpen = ref(false);

function addTag(values) {
    if (!Array.isArray(values) || !values.length) return;
    selectedTags.value = addCommittedTags(selectedTags.value, values);
    entry.value = [];
    menuOpen.value = false;
}
function removeTag(tag) {
    selectedTags.value = selectedTags.value.filter((item) => item !== tag);
}
</script>
