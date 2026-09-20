<template>
    <v-card
        class="border"
        title="Startup"
        subtitle="Pick up where you left off, or start fresh."
        rounded="lg"
        elevation="0"
    >
        <v-card-text class="d-flex flex-column ga-1">
            <div class="d-flex align-center ga-2">
                <v-icon size="large">ph-tabs</v-icon>
                <p class="text-subtitle-2">Restore previous tabs</p>
                <v-spacer />
                <v-switch
                    aria-label="Restore previous tabs"
                    :model-value="tabsStore.restoreOpenTabsOnStartup"
                    color="primary"
                    inset="material"
                    size="small"
                    hide-details
                    @update:model-value="
                        tabsStore.setRestoreOpenTabsOnStartup($event)
                    "
                />
            </div>
            <div class="d-flex align-center flex-wrap ga-3">
                <div class="d-flex align-center ga-2">
                    <v-icon size="large">ph-squares-four</v-icon>
                    <p class="text-subtitle-2">Workspace at startup</p>
                </div>
                <v-spacer />
                <v-menu
                    location="bottom end"
                    max-height="400"
                    max-width="320"
                    :offset="6"
                >
                    <template #activator="{ props }">
                        <v-btn
                            v-bind="props"
                            variant="tonal"
                            rounded="lg"
                            append-icon="ph-caret-down"
                            :loading="saving"
                            :aria-label="`Workspace at startup: ${startupLabel}`"
                            class="startup-workspace-button"
                        >
                            <WorkspaceAvatar
                                v-if="!isLastUsed && startupWorkspace"
                                :workspace="startupWorkspace"
                                :size="24"
                                class="me-2"
                            />
                            <v-icon v-else icon="ph-clock-counter-clockwise" class="me-1"/>
                            <span class="text-truncate">{{
                                startupLabel
                            }}</span>
                        </v-btn>
                    </template>
                    <v-list
                        nav
                        density="compact"
                        rounded="lg"
                        class="pa-2"
                        min-width="240"
                        prepend-gap="8"
                        :disabled="saving"
                    >
                        <v-list-item
                            title="Last used"
                            prepend-icon="ph-clock-counter-clockwise"
                            :active="isLastUsed"
                            rounded="lg"
                            @click="setStartupWorkspace()"
                        >
                            <template #append>
                                <v-icon
                                    v-if="isLastUsed"
                                    icon="ph-check"
                                    size="18"
                                    class="mr-1"
                                />
                            </template>
                        </v-list-item>
                        <v-divider class="my-2" />
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
                        </v-list-item>
                        <v-list-item
                            v-for="workspace in workspaceStore.workspaces"
                            :key="workspace.id"
                            :title="workspace.name"
                            :active="
                                !isLastUsed &&
                                workspace.id ===
                                    workspaceStore.preferences
                                        .startupWorkspaceId
                            "
                            rounded="lg"
                            @click="setStartupWorkspace(workspace.id)"
                        >
                            <template #prepend>
                                <WorkspaceAvatar
                                    :workspace="workspace"
                                    :size="28"
                                />
                            </template>
                            <template #append>
                                <v-icon
                                    v-if="
                                        !isLastUsed &&
                                        workspace.id ===
                                            workspaceStore.preferences
                                                .startupWorkspaceId
                                    "
                                    icon="ph-check"
                                    size="18"
                                    class="mr-1"
                                />
                            </template>
                        </v-list-item>
                    </v-list>
                </v-menu>
            </div>
            <v-alert
                v-if="error"
                type="error"
                variant="tonal"
                rounded="lg"
                role="alert"
                >{{ error }}</v-alert
            >
        </v-card-text>
    </v-card>
</template>

<script setup>
import { useTabsStore } from '../../stores/tabsStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import WorkspaceAvatar from '../workspaces/WorkspaceAvatar.vue';
import { computed, onMounted, ref } from 'vue';

const tabsStore = useTabsStore();
const workspaceStore = useWorkspaceStore();

onMounted(() => workspaceStore.initialize());

const saving = ref(false);
const error = ref('');
const isLastUsed = computed(
    () => workspaceStore.preferences.startupMode === 'last-used',
);
const startupWorkspace = computed(() =>
    workspaceStore.workspaces.find(
        (workspace) =>
            workspace.id === workspaceStore.preferences.startupWorkspaceId,
    ),
);
const startupLabel = computed(() =>
    isLastUsed.value ? 'Last used' : startupWorkspace.value?.name || 'Default',
);
const setStartupWorkspace = async (workspaceId) => {
    if (saving.value) return;
    saving.value = true;
    error.value = '';
    try {
        await workspaceStore.setStartupPreferences({
            startupMode: workspaceId ? 'specific' : 'last-used',
            startupWorkspaceId:
                workspaceId || workspaceStore.preferences.startupWorkspaceId,
        });
    } catch (cause) {
        error.value = cause.message || 'Could not save the startup preference.';
    } finally {
        saving.value = false;
    }
};
</script>

<style scoped>
.startup-workspace-button {
    max-width: min(100%, 320px);
}
.startup-workspace-button :deep(.v-btn__content) {
    min-width: 0;
}
</style>
