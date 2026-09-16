<template>
    <v-card
        class="border"
        title="Sync"
        subtitle="Your notes, always in sync."
        rounded="lg"
        elevation="0"
    >
        <template #append>
            <SettingsInfoButton title="How sync works">
                <p class="ma-0 mb-2 text-body-1">
                    Lumos saves snapshots to a shared folder. Your sync provider
                    transfers them between computers.
                </p>
                <ul class="d-flex flex-column ga-2 my-0 pl-5">
                    <li>
                        <strong class="text-high-emphasis">Setup:</strong>
                        choose the same folder on each computer via iCloud
                        Drive, Google Drive, Dropbox, OneDrive, or Syncthing.
                    </li>
                    <li>
                        <strong class="text-high-emphasis">Save:</strong>
                        after
                        <strong class="text-high-emphasis">45 seconds</strong>
                        without changes, or click
                        <strong class="text-high-emphasis">Sync now</strong>.
                        <strong class="text-high-emphasis">Synced</strong> means
                        the snapshot was saved locally; your provider still has
                        to upload it.
                    </li>
                    <li>
                        <strong class="text-high-emphasis">
                            Switch devices:
                        </strong>
                        wait for the transfer, then start or restart Lumos on
                        the other computer.
                    </li>
                    <li>
                        <strong class="text-high-emphasis">
                            One computer at a time:
                        </strong>
                        incoming notes replace local notes. Simultaneous edits
                        aren’t merged. Lumos keeps the latest 3
                        pre-device-restore backups in case you need to revert.
                    </li>
                </ul>
                <p class="ma-0 mt-2 text-caption text-medium-emphasis">
                    Turning sync off disconnects the folder. Existing snapshots
                    stay there.
                </p>
            </SettingsInfoButton>
        </template>
        <v-card-text>
            <div class="d-flex align-center ga-2">
                <v-icon size="small">ph-arrows-clockwise</v-icon>
                <p id="sync-toggle-label" class="text-subtitle-2">
                    Sync notes across devices
                </p>
                <v-spacer />
                <v-switch
                    :model-value="status.enabled"
                    :disabled="busy || !ready"
                    :loading="selecting || disabling"
                    color="primary"
                    inset="material"
                    size="small"
                    hide-details
                    aria-labelledby="sync-toggle-label"
                    @update:model-value="toggleSync"
                />
            </div>

            <v-alert
                v-if="actionError"
                type="error"
                variant="tonal"
                density="compact"
                rounded="lg"
                class="mt-4"
                role="alert"
            >
                {{ actionError }}
            </v-alert>

            <template v-if="status.enabled">
                <v-sheet border rounded="lg" class="mt-3">
                    <div
                        class="d-flex flex-column flex-sm-row align-sm-center ga-3 pa-4"
                    >
                        <div class="flex-1-1-0" style="min-width: 0">
                            <div class="d-flex align-center ga-2 mb-1">
                                <v-icon icon="ph-folder" size="small" />
                                <span class="text-body-2 font-weight-medium">
                                    Sync folder
                                </span>
                            </div>
                            <p
                                class="text-body-2 text-medium-emphasis text-break"
                            >
                                {{ status.vaultPath }}
                            </p>
                        </div>
                        <div
                            class="d-flex ga-1 flex-shrink-0 align-self-start align-self-sm-center"
                        >
                            <v-btn
                                v-for="action in folderActions"
                                :key="action.label"
                                icon
                                variant="text"
                                size="small"
                                rounded="lg"
                                density="comfortable"
                                class="ml-2"
                                :aria-label="action.label"
                                :disabled="busy"
                                :loading="action.loading"
                                @click="action.handler"
                            >
                                <v-icon :icon="action.icon" />
                                <v-tooltip activator="parent" location="top">
                                    {{ action.label }}
                                </v-tooltip>
                            </v-btn>
                        </div>
                    </div>
                    <v-divider />
                    <div
                        class="d-flex flex-column flex-sm-row align-sm-center ga-3 px-4 py-3"
                    >
                        <div
                            class="d-flex align-center flex-wrap ga-2 flex-grow-1"
                        >
                            <v-chip
                                :color="statusColor"
                                :prepend-icon="statusIcon"
                                variant="tonal"
                                size="small"
                                role="status"
                                rounded="lg"
                                class="mr-2"
                            >
                                {{ statusLabel }}
                            </v-chip>
                            <span
                                v-if="status.lastSyncedAt"
                                class="text-caption text-medium-emphasis"
                            >
                                Last synced
                                {{ formatDate(status.lastSyncedAt) }}
                            </span>
                        </div>
                        <v-btn
                            class="flex-shrink-0 align-self-start align-self-sm-center"
                            color="primary"
                            variant="tonal"
                            prepend-icon="ph-arrows-clockwise"
                            :loading="syncing || status.status === 'syncing'"
                            :disabled="busy || restartRequired"
                            @click="syncNow"
                        >
                            Sync now
                        </v-btn>
                    </div>
                </v-sheet>
                <v-alert
                    v-if="status.lastError"
                    type="warning"
                    variant="tonal"
                    density="compact"
                    rounded="lg"
                    class="mt-4"
                >
                    {{ status.lastError }}
                </v-alert>
                <v-alert
                    v-if="restartRequired"
                    type="info"
                    variant="tonal"
                    density="compact"
                    rounded="lg"
                    class="mt-4"
                >
                    Restart Lumos to load the existing notes from this sync
                    folder.
                </v-alert>
            </template>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import SettingsInfoButton from './SettingsInfoButton.vue';

const status = ref({ enabled: false, status: 'disabled' });
const selecting = ref(false);
const syncing = ref(false);
const disabling = ref(false);
const ready = ref(false);
const actionError = ref('');
const restartRequired = ref(false);
const folderActions = computed(() => [
    {
        label: 'Change sync folder',
        icon: 'ph-pencil-simple',
        loading: selecting.value,
        handler: selectFolder,
    },
    {
        label: 'Open sync folder',
        icon: 'ph-folder-open',
        loading: false,
        handler: revealFolder,
    },
]);
let unsubscribe = null;
const busy = computed(
    () =>
        selecting.value ||
        syncing.value ||
        disabling.value ||
        status.value.status === 'syncing',
);

const statusLabel = computed(() => {
    const labels = {
        disabled: 'Disabled',
        pending: 'Pending',
        syncing: 'Saving...',
        synced: 'Synced',
        'remote-update': 'Remote update available',
        diverged: 'Recovery needed',
        error: 'Sync error',
    };
    return labels[status.value.status] || 'Sync status unknown';
});

const statusIcon = computed(() => {
    const icons = {
        disabled: 'ph-pause-circle',
        pending: 'ph-clock',
        syncing: 'ph-arrows-clockwise',
        synced: 'ph-check-circle',
        'remote-update': 'ph-download-simple',
        diverged: 'ph-warning',
        error: 'ph-warning-circle',
    };
    return icons[status.value.status] || 'ph-question';
});

const statusColor = computed(() => {
    if (status.value.status === 'synced') return 'success';
    if (['error', 'diverged'].includes(status.value.status)) return 'warning';
    return 'primary';
});

function formatDate(value) {
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

async function refresh() {
    status.value = await window.api.getSyncStatus();
    ready.value = true;
}

async function toggleSync(enabled) {
    if (busy.value || !ready.value || enabled === status.value.enabled) return;
    if (enabled) await selectFolder();
    else await disableSync();
}

async function selectFolder() {
    if (busy.value) return;
    selecting.value = true;
    actionError.value = '';
    try {
        const result = await window.api.selectSyncFolder();
        if (!result.canceled) {
            restartRequired.value = Boolean(result.requiresRestart);
            await refresh();
        }
    } catch (error) {
        actionError.value =
            error.message || 'Could not connect the sync folder.';
    } finally {
        selecting.value = false;
    }
}

async function syncNow() {
    syncing.value = true;
    actionError.value = '';
    try {
        await window.api.syncNow();
        await refresh();
    } catch (error) {
        actionError.value = error.message || 'Could not save a sync snapshot.';
    } finally {
        syncing.value = false;
    }
}

async function revealFolder() {
    actionError.value = '';
    try {
        await window.api.revealSyncFolder();
    } catch (error) {
        actionError.value = error.message || 'Could not open the sync folder.';
    }
}

async function disableSync() {
    disabling.value = true;
    actionError.value = '';
    try {
        await window.api.disableSync();
        restartRequired.value = false;
        await refresh();
    } catch (error) {
        actionError.value = error.message || 'Could not turn off device sync.';
    } finally {
        disabling.value = false;
    }
}

onMounted(async () => {
    unsubscribe = window.api.onSyncStatus((nextStatus) => {
        status.value = nextStatus;
        ready.value = true;
    });
    try {
        await refresh();
    } catch (error) {
        actionError.value = error.message || 'Could not load sync status.';
    }
});

onBeforeUnmount(() => unsubscribe?.());
</script>
