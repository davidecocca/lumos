<template>
    <v-card
        class="border"
        title="Workspaces"
        subtitle="Organize your notes into separate spaces."
        rounded="lg"
        elevation="0"
    >
        <v-card-text class="d-flex flex-column ga-3">
            <!-- Workspace card header -->
            <div class="d-flex align-center flex-wrap ga-3">
                <h3 class="text-subtitle-1 font-weight-medium">
                    Your workspaces
                </h3>
                <v-progress-circular
                    v-if="loading"
                    indeterminate
                    :size="14"
                    :width="2"
                    class="text-medium-emphasis"
                    aria-label="Loading workspaces"
                />
                <v-btn
                    class="ml-auto"
                    color="primary"
                    variant="tonal"
                    prepend-icon="ph-plus"
                    :disabled="loading"
                    @click="openCreate"
                >
                    New workspace
                </v-btn>
            </div>

            <!-- Workspace list -->
            <v-list
                nav
                density="compact"
                class="pa-0 bg-transparent"
                prepend-gap="8"
            >
                <v-list-item
                    v-for="workspace in paginatedWorkspaces"
                    :key="workspace.id"
                    rounded="lg"
                >
                    <template #prepend>
                        <WorkspaceAvatar :workspace="workspace" :size="28" />
                    </template>
                    <v-list-item-title class="d-flex align-center">
                        {{ workspace.name }}
                        <v-icon
                            v-if="
                                workspace.id ===
                                workspaceStore.currentWorkspaceId
                            "
                            icon="ph-check"
                            size="x-small"
                            class="ml-2"
                            role="img"
                            aria-label="Current workspace"
                        />
                    </v-list-item-title>
                    <template #append>
                        <v-tooltip
                            v-for="action in workspaceActions"
                            :key="action.label"
                            :text="action.tooltip(workspace)"
                            location="top"
                        >
                            <template #activator="{ props }">
                                <span
                                    v-bind="props"
                                    class="d-inline-flex"
                                    :tabindex="
                                        action.disabled(workspace)
                                            ? 0
                                            : undefined
                                    "
                                    :aria-label="
                                        action.disabled(workspace)
                                            ? action.tooltip(workspace)
                                            : undefined
                                    "
                                >
                                    <v-btn
                                        icon
                                        variant="text"
                                        size="small"
                                        rounded="lg"
                                        density="comfortable"
                                        class="ml-2"
                                        :color="action.color"
                                        :disabled="action.disabled(workspace)"
                                        :aria-label="`${action.label} ${workspace.name}`"
                                        @click="action.handler(workspace)"
                                    >
                                        <v-icon :icon="action.icon" />
                                    </v-btn>
                                </span>
                            </template>
                        </v-tooltip>
                    </template>
                </v-list-item>
            </v-list>
            <div
                v-if="workspaceStore.workspaces.length"
                class="d-flex align-center justify-space-between flex-wrap ga-2"
            >
                <span class="text-caption text-medium-emphasis" role="status">
                    {{ (page - 1) * pageSize + 1 }}–{{
                        Math.min(
                            page * pageSize,
                            workspaceStore.workspaces.length,
                        )
                    }}
                    of {{ workspaceStore.workspaces.length }} workspaces
                </span>
                <v-pagination
                    v-if="pageCount > 1"
                    v-model="page"
                    :length="pageCount"
                    :total-visible="5"
                    :disabled="loading"
                    size="small"
                    density="comfortable"
                    rounded="lg"
                    prev-icon="ph-caret-left"
                    next-icon="ph-caret-right"
                    aria-label="Workspace pages"
                />
            </div>
        </v-card-text>
    </v-card>

    <WorkspaceFormDialog v-model="formDialog" :workspace="selectedWorkspace" />
    <DeleteWorkspaceDialog
        v-model="deleteDialog"
        :workspace="selectedWorkspace"
    />
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import WorkspaceAvatar from '../workspaces/WorkspaceAvatar.vue';
import WorkspaceFormDialog from './dialogs/WorkspaceFormDialog.vue';
import DeleteWorkspaceDialog from './dialogs/DeleteWorkspaceDialog.vue';

const workspaceStore = useWorkspaceStore();
const formDialog = ref(false);
const deleteDialog = ref(false);
const selectedWorkspace = ref(null);
const pageSize = 5;
const page = ref(1);
const loading = computed(() => !workspaceStore.initialized);
const pageCount = computed(() =>
    Math.max(1, Math.ceil(workspaceStore.workspaces.length / pageSize)),
);
const paginatedWorkspaces = computed(() =>
    workspaceStore.workspaces.slice(
        (page.value - 1) * pageSize,
        page.value * pageSize,
    ),
);

watch(pageCount, (count) => {
    if (page.value > count) page.value = count;
});

onMounted(() => workspaceStore.initialize());

const openCreate = () => {
    selectedWorkspace.value = null;
    formDialog.value = true;
};
const openEdit = (workspace) => {
    selectedWorkspace.value = workspace;
    formDialog.value = true;
};
const openDelete = (workspace) => {
    if (workspace.is_default) return;
    selectedWorkspace.value = workspace;
    deleteDialog.value = true;
};

const workspaceActions = [
    {
        label: 'Edit',
        icon: 'ph-pencil-simple-line',
        tooltip: () => 'Edit workspace',
        disabled: () => false,
        handler: openEdit,
    },
    {
        label: 'Delete',
        icon: 'ph-trash',
        color: 'error',
        tooltip: (workspace) =>
            workspace.is_default
                ? 'Default workspace cannot be deleted'
                : 'Delete workspace',
        disabled: (workspace) => !!workspace.is_default,
        handler: openDelete,
    },
];
</script>
