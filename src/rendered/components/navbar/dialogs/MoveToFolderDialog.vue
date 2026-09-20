<template>
    <BaseDialog
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        title="Move note"
        subtitle="Choose a workspace and folder."
        icon="ph-arrow-right"
    >
        <WorkspaceSelect
            v-model="selectedWorkspaceId"
            :workspaces="workspaces"
            :disabled="loadingFolders"
            class="mb-4"
        />
        <v-select
            v-model="newFolderId"
            :items="workspaceFolders"
            item-title="name"
            item-value="id"
            label="Folder"
            variant="outlined"
            density="comfortable"
            rounded="lg"
            :loading="loadingFolders"
            :disabled="loadingFolders"
            hide-details="auto"
            no-data-text="This workspace has no folders yet. Create one first."
            :menu-props="{ contentClass: 'rounded-lg' }"
            :list-props="{
                nav: true,
                density: 'compact',
                class: 'pa-2',
                prependGap: 8,
            }"
            :item-props="() => ({ rounded: 'lg', prependIcon: 'ph-folder' })"
        />
        <v-alert
            v-if="folderError"
            type="error"
            variant="tonal"
            rounded="lg"
            class="mt-3"
            role="alert"
            >{{ folderError }}</v-alert
        >

        <template #actions>
            <v-spacer />
            <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
            <v-btn
                color="primary"
                variant="tonal"
                :disabled="!newFolderId || loadingFolders"
                @click="moveNote"
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
    folders: {
        type: Array,
        default: () => [],
    },
    workspaces: {
        type: Array,
        default: () => [],
    },
    currentWorkspaceId: {
        type: String,
        default: null,
    },
    noteId: {
        type: Number,
        default: null,
    },
    currentFolderId: {
        type: Number,
        default: null,
    },
});

const emit = defineEmits(['update:modelValue', 'move-note']);
const newFolderId = ref(null);
const selectedWorkspaceId = ref(null);
const workspaceFolders = ref([]);
const loadingFolders = ref(false);
const folderError = ref('');

const currentWorkspaceFolders = computed(() =>
    props.folders.filter((folder) => folder.id !== props.currentFolderId),
);

const loadWorkspaceFolders = async (workspaceId) => {
    workspaceFolders.value = [];
    loadingFolders.value = false;
    folderError.value = '';
    if (!workspaceId) {
        workspaceFolders.value = [];
        return;
    }

    if (workspaceId === props.currentWorkspaceId) {
        workspaceFolders.value = currentWorkspaceFolders.value;
        return;
    }

    loadingFolders.value = true;
    try {
        const folders = await window.api.listFoldersForWorkspace(workspaceId);
        if (props.modelValue && workspaceId === selectedWorkspaceId.value) {
            workspaceFolders.value = folders;
        }
    } catch (error) {
        if (props.modelValue && workspaceId === selectedWorkspaceId.value) {
            folderError.value =
                'Could not load folders. Close this dialog and try again.';
        }
    } finally {
        if (props.modelValue && workspaceId === selectedWorkspaceId.value) {
            loadingFolders.value = false;
        }
    }
};

watch(
    [() => props.modelValue, selectedWorkspaceId],
    async ([isOpen, workspaceId]) => {
        if (!isOpen) return;
        newFolderId.value = null;
        await loadWorkspaceFolders(workspaceId);
    },
);

watch(
    () => props.modelValue,
    (isOpen) => {
        if (!isOpen) return;
        selectedWorkspaceId.value = props.currentWorkspaceId;
        newFolderId.value = null;
    },
);

const closeDialog = () => emit('update:modelValue', false);

const moveNote = () => {
    if (
        !newFolderId.value ||
        !selectedWorkspaceId.value ||
        loadingFolders.value
    )
        return;
    emit('move-note', props.noteId, newFolderId.value, {
        targetWorkspaceId: selectedWorkspaceId.value,
    });
    newFolderId.value = null;
    closeDialog();
};
</script>
