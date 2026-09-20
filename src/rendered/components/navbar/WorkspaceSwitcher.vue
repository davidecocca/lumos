<template>
    <v-div
        class="flex-shrink-0 pa-2"
        :class="{ 'd-flex justify-center': rail }"
    >
        <v-tooltip
            :text="'Current workspace: ' + currentName"
            location="right"
            :disabled="!rail || menuOpen"
        >
            <template #activator="{ props: tooltipProps }">
                <v-menu
                    v-model="menuOpen"
                    location="top start"
                    max-width="320"
                    :offset="16"
                >
                    <template #activator="{ props: menuProps }">
                        <v-btn
                            v-bind="mergeProps(menuProps, tooltipProps)"
                            variant="text"
                            rounded="lg"
                            height="40"
                            class="py-1 px-2"
                            :block="!rail"
                            :icon="rail"
                            :class="{ 'workspace-button': !rail }"
                            aria-label="Switch workspace"
                        >
                            <WorkspaceAvatar
                                :workspace="workspaceStore.currentWorkspace"
                                :size="28"
                                :class="{ 'me-1': !rail }"
                            />
                            <span v-if="!rail" class="text-truncate">{{
                                currentName
                            }}</span>
                            <v-progress-circular
                                v-if="!rail && workspaceStore.switching"
                                indeterminate
                                :size="18"
                                :width="2"
                                class="ms-auto flex-shrink-0"
                            />
                            <v-icon
                                v-else-if="!rail"
                                :icon="
                                    menuOpen ? 'ph-caret-down' : 'ph-caret-up'
                                "
                                size="18"
                                class="ms-auto flex-shrink-0"
                            />
                        </v-btn>
                    </template>

                    <v-list
                        nav
                        density="compact"
                        min-width="240"
                        max-height="400"
                        rounded="lg"
                        class="d-flex flex-column pa-2"
                        prepend-gap="8"
                    >
                        <v-list-item
                            min-height="32"
                            class="mb-1"
                            :ripple="false"
                            rounded="lg"
                        >
                            <v-list-subheader
                                class="pa-0 text-medium-emphasis font-weight-medium"
                                >Workspaces</v-list-subheader
                            >
                            <template #append>
                                <v-tooltip text="New workspace" location="top">
                                    <template #activator="{ props }">
                                        <v-btn
                                            v-bind="props"
                                            icon="ph-plus"
                                            variant="text"
                                            size="small"
                                            density="comfortable"
                                            class="text-medium-emphasis"
                                            rounded="lg"
                                            aria-label="New workspace"
                                            @click.stop="openCreate"
                                        />
                                    </template>
                                </v-tooltip>
                            </template>
                        </v-list-item>
                        <div class="flex-grow-1 overflow-y-auto">
                            <v-list-item
                                v-for="workspace in workspaceStore.workspaces"
                                :key="workspace.id"
                                :active="
                                    workspace.id ===
                                    workspaceStore.currentWorkspaceId
                                "
                                :disabled="workspaceStore.switching"
                                rounded="lg"
                                @click="switchWorkspace(workspace.id)"
                            >
                                <template #prepend>
                                    <WorkspaceAvatar
                                        :workspace="workspace"
                                        :size="28"
                                    />
                                </template>
                                <v-list-item-title>{{
                                    workspace.name
                                }}</v-list-item-title>
                                <template #append>
                                    <v-icon
                                        v-if="
                                            workspace.id ===
                                            workspaceStore.currentWorkspaceId
                                        "
                                        icon="ph-check"
                                        size="18"
                                        class="mr-1"
                                    />
                                </template>
                            </v-list-item>
                        </div>
                        <v-divider class="my-2" />
                        <v-list-item rounded="lg" @click="openSettings">
                            <template #prepend
                                ><v-icon icon="ph-gear-six"
                            /></template>
                            <v-list-item-title
                                >Manage workspaces</v-list-item-title
                            >
                        </v-list-item>
                    </v-list>
                </v-menu>
            </template>
        </v-tooltip>
        <WorkspaceFormDialog v-model="formDialog" />
    </v-div>
</template>

<script setup>
import { computed, mergeProps, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import WorkspaceAvatar from '../workspaces/WorkspaceAvatar.vue';
import WorkspaceFormDialog from '../settings/dialogs/WorkspaceFormDialog.vue';

defineProps({
    rail: {
        type: Boolean,
        default: false,
    },
});

const router = useRouter();
const workspaceStore = useWorkspaceStore();
const menuOpen = ref(false);
const formDialog = ref(false);
const currentName = computed(
    () => workspaceStore.currentWorkspace?.name || 'Workspace',
);

const switchWorkspace = async (workspaceId) => {
    try {
        await workspaceStore.switchWorkspace(workspaceId);
    } catch (error) {
        console.error('Could not switch workspace:', error);
    }
};

const openSettings = () => router.push({ name: 'settings' });
const openCreate = () => {
    menuOpen.value = false;
    formDialog.value = true;
};
</script>

<style scoped>
/* Vuetify utilities cannot target this inner wrapper. Make it fill the button so
   the workspace content stays left-aligned and the status icon can use ms-auto. */
.workspace-button :deep(.v-btn__content) {
    width: 100%;
    min-width: 0;
    justify-content: flex-start;
    gap: 4px;
}
</style>
