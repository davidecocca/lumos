<template>
    <BaseDialog
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        :title="confirmationDialogTitle"
        icon="ph-trash"
        icon-color="error"
    >
        {{ confirmationDialogText }}

        <template #actions>
            <v-spacer />
            <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
            <v-btn color="error" variant="tonal" @click="deleteFolder"
                >Delete</v-btn
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
    confirmationDialogTitle: {
        type: String,
        default: '',
    },
    confirmationDialogText: {
        type: String,
        default: '',
    },
    confirmationDialogButtonColor: {
        type: String,
        default: 'primary',
    },
    folderId: {
        type: Number,
        mandatory: true,
    },
});

const emit = defineEmits(['update:modelValue', 'delete-folder']);

const folderIdToDelete = ref(null);

watch(
    () => props.modelValue,
    (newVal) => {
        if (newVal) {
            folderIdToDelete.value = props.folderId;
        }
    },
);

const closeDialog = () => {
    emit('update:modelValue', false);
};

const deleteFolder = () => {
    emit('delete-folder', folderIdToDelete.value);
};
</script>
