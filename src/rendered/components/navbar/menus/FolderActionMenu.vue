<template>
    <div
    v-show="visible"
    class="d-flex align-center ga-1 mr-1"
    >
    <v-tooltip text="New note" location="top">
        <template v-slot:activator="{ props }">
            <v-btn
            v-bind="props"
            icon="ph-plus"
            variant="text"
            size="small"
            title="New note"
            density="compact"
            rounded
            @click.stop="store.openCreateNoteDialog(folder.id)"
            />
        </template>
    </v-tooltip>
    <v-menu
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    >
    <template v-slot:activator="{ props }">
        <v-tooltip text="More" location="top">
            <template v-slot:activator="{ props: tooltipProps }">
                <v-btn
                v-bind="{ ...props, ...tooltipProps }"
                icon="ph-dots-three"
                size="small"
                variant="text"
                density="compact"
                rounded
                />
            </template>
        </v-tooltip>
    </template>
    <v-list density="compact" rounded="lg" class="pl-1 pr-1 pt-2 pb-2">
        <v-list-item
        v-for="item in menuItems"
        :key="item.value"
        :class="item.class"
        :base-color="item.baseColor"
        @click="item.action"
        rounded="lg"
        >
        <template v-slot:append>
            <v-icon :icon="item.icon"></v-icon>
        </template>
        <v-list-item-title>{{ item.title }}</v-list-item-title>
    </v-list-item>
</v-list>
</v-menu>
</div>
</template>

<script setup>
import { computed } from 'vue'
import { useFoldersStore } from '../../../stores/foldersStore'

const props = defineProps({
    folder: {
        type: Object,
        required: true
    },
    visible: {
        type: Boolean,
        default: false
    },
    modelValue: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['update:modelValue'])
const store = useFoldersStore()

const menuItems = computed(() => [
{
    value: 'rename',
    title: 'Rename',
    icon: 'ph-pencil-simple-line',
    action: () => store.openRenameFolderDialog(props.folder.id, props.folder.name)
},
{
    value: 'delete',
    title: 'Delete',
    icon: 'ph-trash',
    class: 'delete-menu-action',
    baseColor: 'error',
    action: () => store.openDeleteFolderConfirmationDialog(props.folder.id)
}
])
</script>
