<template>
    <BaseDialog
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        title="Move folder"
        subtitle="Move this folder and all its notes to another workspace."
        icon="ph-arrow-right"
    >
        <WorkspaceSelect
            v-model="workspaceId"
            :workspaces="destinationWorkspaces"
            label="Workspace"
        />
        <p
            v-if="!destinationWorkspaces.length"
            class="text-body-small text-medium-emphasis mt-3"
        >
            Create another workspace to move this folder.
        </p>
        <template #actions>
            <v-spacer />
            <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
            <v-btn
                color="primary"
                variant="tonal"
                :disabled="!workspaceId || workspaceId === currentWorkspaceId"
                @click="moveFolder"
            >
                Move
            </v-btn>
        </template>
    </BaseDialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import BaseDialog from '../../commons/BaseDialog.vue';
import WorkspaceSelect from '../../workspaces/WorkspaceSelect.vue';

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false,
    },
    workspaces: {
        type: Array,
        default: () => [],
    },
    currentWorkspaceId: {
        type: String,
        default: null,
    },
    folderId: {
        type: Number,
        default: null,
    },
});

const emit = defineEmits(['update:modelValue', 'move-folder']);
const workspaceId = ref(null);
const destinationWorkspaces = computed(() =>
    props.workspaces.filter(
        (workspace) => workspace.id !== props.currentWorkspaceId,
    ),
);

watch(
    () => props.modelValue,
    (isOpen) => {
        if (isOpen) workspaceId.value = null;
    },
);

const closeDialog = () => emit('update:modelValue', false);

const moveFolder = () => {
    if (!workspaceId.value || workspaceId.value === props.currentWorkspaceId) {
        return;
    }
    emit('move-folder', props.folderId, workspaceId.value);
    closeDialog();
};
</script>
