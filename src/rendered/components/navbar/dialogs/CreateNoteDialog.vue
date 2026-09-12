<template>
    <BaseDialog
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        title="New note"
        subtitle="Choose a folder and add a title."
        icon="ph-plus"
    >
        <v-select
            v-if="showFolderPicker"
            v-model="selectedFolderId"
            :items="folders"
            item-title="name"
            item-value="id"
            label="Folder"
            variant="outlined"
            density="comfortable"
            rounded="lg"
            :menu-props="{ contentClass: 'rounded-lg' }"
            :list-props="{
                density: 'compact',
                class: 'pl-1 pr-1 pt-2 pb-2',
                rounded: 'lg',
            }"
            :item-props="() => ({ rounded: 'lg' })"
            class="mb-3"
            :rules="[(v) => !!v || 'Folder is required']"
        ></v-select>

        <v-text-field
            v-model="noteTitle"
            label="Note title"
            clearable
            variant="outlined"
            density="comfortable"
            rounded="lg"
            @click:clear="handleClear"
            @keydown.enter="handleEnter"
        />

        <template #actions>
            <v-spacer />
            <v-btn variant="text" @click="closeDialog()">Cancel</v-btn>
            <v-btn
                color="primary"
                variant="tonal"
                @click="saveNote"
                :disabled="!noteTitle.trim() || !selectedFolderId"
                >Create</v-btn
            >
        </template>
    </BaseDialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import BaseDialog from '../../commons/BaseDialog.vue';

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false,
    },
    folders: {
        type: Array,
        default: () => [],
    },
    folderId: {
        type: Number,
        default: null,
    },
    showFolderPicker: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(['update:modelValue', 'create-note']);

const noteTitle = ref('Untitled note');
const selectedFolderId = ref(null);

const syncFolder = () => {
    const isKnownFolder = (id) =>
        props.folders.some((folder) => folder.id === id);

    if (isKnownFolder(props.folderId)) {
        selectedFolderId.value = props.folderId;
    } else if (props.folders.length) {
        selectedFolderId.value = props.folders[0].id;
    } else {
        selectedFolderId.value = null;
    }
};

watch(
    () => props.modelValue,
    (isOpen) => {
        if (isOpen) {
            syncFolder();
        }
    },
);

const closeDialog = () => {
    emit('update:modelValue', false);
    noteTitle.value = 'Untitled note';
};

const handleClear = () => {
    noteTitle.value = '';
};

const saveNote = () => {
    if (noteTitle.value.trim() && selectedFolderId.value) {
        emit('create-note', selectedFolderId.value, noteTitle.value.trim());
        noteTitle.value = 'Untitled note';
    }
};

const handleEnter = () => {
    if (noteTitle.value.trim() && selectedFolderId.value) {
        saveNote();
    }
};
</script>
