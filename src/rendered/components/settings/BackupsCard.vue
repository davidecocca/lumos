<template>
    <v-card
        class="border"
        title="Backup"
        subtitle="Keep it safe. Back it up. Restore anytime."
        rounded="lg"
        elevation="0"
    >
        <v-card-text>
            <!-- Backup policies banner -->
            <v-alert
                type="info"
                icon-size="20"
                variant="tonal"
                density="compact"
                rounded="lg"
                border="start"
                class="text-body-2 mb-4"
                closable
            >
                Lumos creates one automatic backup each day and keeps the latest 30.
                Manual backups stay until you delete them.
            </v-alert>

            <!-- Backup card header -->
            <div class="d-flex align-center flex-wrap ga-3">
                <h3 class="text-subtitle-1 font-weight-medium">Your backups</h3>
                <v-progress-circular
                    v-if="loading"
                    indeterminate
                    :size="14"
                    :width="2"
                    class="text-medium-emphasis"
                    aria-label="Loading backups"
                />
                <v-btn
                    class="ml-auto"
                    color="primary"
                    variant="tonal"
                    prepend-icon="ph-plus"
                    :disabled="loading"
                    :loading="creating"
                    @click="openCreateDialog"
                >
                    New backup
                </v-btn>
            </div>

            <!-- Backup list -->
            <v-list
                v-if="backups.length"
                lines="two"
                max-height="min(400px, 40vh)"
                class="pa-0 overflow-y-auto"
            >
                <template v-for="(backup, index) in backups" :key="backup.id">
                    <v-list-item>
                        <template #prepend>
                            <v-chip
                                :color="backupType(backup).color"
                                variant="tonal"
                                size="small"
                                rounded="lg"
                                density="comfortable"
                                class="mr-4 justify-center"
                                style="width: 92px"
                            >
                                  <template v-slot:prepend>
                                    <v-icon :icon="backupType(backup).icon" size="small" class="mr-1"/>
                                </template>
                                {{ backupType(backup).label }}
                            </v-chip>
                        </template>
                        <v-list-item-title :title="backupLabel(backup)">
                            {{ backupLabel(backup) }}
                        </v-list-item-title>
                        <div class="text-body-2 text-medium-emphasis mt-1">
                            {{ formatDate(backup.createdAt) }} ·
                            {{ backup.noteCount }}
                            {{ backup.noteCount === 1 ? 'note' : 'notes' }} ·
                            {{ formatSize(backup.size) }}
                        </div>
                        <template #append>
                            <v-btn
                                v-for="action in backupActions"
                                :key="action.label"
                                icon
                                variant="text"
                                size="small"
                                :color="action.color"
                                :aria-label="
                                    `${action.label} ${backupLabel(backup)}`
                                "
                                @click="action.handler(backup)"
                            >
                                <v-icon :icon="action.icon" />
                                <v-tooltip activator="parent" location="top">
                                    {{ action.tooltip }}
                                </v-tooltip>
                            </v-btn>
                        </template>
                    </v-list-item>
                    <v-divider v-if="index < backups.length - 1" />
                </template>
            </v-list>

            <EmptyState
                v-else-if="!loading && !errorMessage"
                title="No backups yet"
                text="Create one now, or wait for the next automatic backup."
                icon="ph-database"
                width="100%"
            />

            <v-btn
                class="mt-6"
                variant="text"
                prepend-icon="ph-folder-open"
                @click="selectBackupForRestore"
            >
                Restore external backup
            </v-btn>
        </v-card-text>

        <CreateBackupDialog
            v-model="createDialog"
            v-model:name="manualBackupName"
            :creating="creating"
            :error="dialogError"
            @submit="createBackup"
        />

        <RenameBackupDialog
            v-model="renameDialog"
            v-model:name="renamedBackupName"
            :renaming="renaming"
            :error="dialogError"
            @submit="renameBackup"
        />

        <RestoreBackupDialog
            v-model="restoreDialog"
            :show-backup="Boolean(backupToRestore)"
            :backup-label="backupToRestore ? backupLabel(backupToRestore) : ''"
            :backup-date="
                backupToRestore?.createdAt
                    ? formatDate(backupToRestore.createdAt)
                    : ''
            "
            :backup-path="backupToRestore?.path || ''"
            :restoring="restoring"
            :error="dialogError"
            @restore="restoreBackup"
        />

        <ConfirmDeleteBackupDialog
            v-model="deleteDialog"
            :show-backup="Boolean(backupToDelete)"
            :backup-label="backupToDelete ? backupLabel(backupToDelete) : ''"
            :backup-date="
                backupToDelete ? formatDate(backupToDelete.createdAt) : ''
            "
            :deleting="deleting"
            :error="dialogError"
            @delete="deleteBackup"
        />
    </v-card>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import EmptyState from '../commons/EmptyState.vue';
import ConfirmDeleteBackupDialog from './dialogs/ConfirmDeleteBackupDialog.vue';
import CreateBackupDialog from './dialogs/CreateBackupDialog.vue';
import RenameBackupDialog from './dialogs/RenameBackupDialog.vue';
import RestoreBackupDialog from './dialogs/RestoreBackupDialog.vue';

const backups = ref([]);
const loading = ref(true);
const creating = ref(false);
const createDialog = ref(false);
const manualBackupName = ref('');
const restoring = ref(false);
const deleting = ref(false);
const renaming = ref(false);
const dialogError = ref('');
const errorMessage = ref('');
const backupToRestore = ref(null);
const backupToDelete = ref(null);
const backupToRename = ref(null);
const renamedBackupName = ref('');

const restoreDialog = computed({
    get: () => Boolean(backupToRestore.value),
    set: (value) => {
        if (!value) backupToRestore.value = null;
    },
});
const deleteDialog = computed({
    get: () => Boolean(backupToDelete.value),
    set: (value) => {
        if (!value) backupToDelete.value = null;
    },
});
const renameDialog = computed({
    get: () => Boolean(backupToRename.value),
    set: (value) => {
        if (!value) backupToRename.value = null;
    },
});

const backupActions = [
    {
        label: 'Restore',
        icon: 'ph-arrow-counter-clockwise',
        tooltip: 'Restore backup',
        handler: confirmRestore,
    },
    {
        label: 'Export',
        icon: 'ph-export',
        tooltip: 'Export backup',
        handler: exportBackup,
    },
    {
        label: 'Rename',
        icon: 'ph-pencil-simple',
        tooltip: 'Rename backup',
        handler: openRenameDialog,
    },
    {
        label: 'Open folder for',
        icon: 'ph-folder-open',
        tooltip: 'Open backup folder',
        handler: revealBackup,
    },
    {
        label: 'Delete',
        icon: 'ph-trash',
        tooltip: 'Delete backup',
        color: 'error',
        handler: confirmDelete,
    },
];

function formatDate(value) {
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

function formatSize(bytes) {
    if (bytes < 1024 * 1024)
        return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function backupLabel(backup) {
    return backup.name || backup.id;
}

function backupType(backup) {
    if (backup.trigger === 'automatic')
        return { label: 'auto', color: '', icon: 'ph-clock' };
    if (backup.trigger === 'pre-restore')
        return { label: 'pre-restore', color: 'amber', icon: 'ph-shield-check' };
    return { label: 'manual', color: 'info', icon: 'ph-user' };
}

function openCreateDialog() {
    const date = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    const day = [
        date.getFullYear(),
        pad(date.getMonth() + 1),
        pad(date.getDate()),
    ];
    const time = [date.getHours(), date.getMinutes(), date.getSeconds()].map(
        pad,
    );
    manualBackupName.value = `${day.join('_')}_${time.join(':')}_manual_backup`;
    dialogError.value = '';
    createDialog.value = true;
}

async function refresh() {
    loading.value = true;
    try {
        backups.value = await window.api.listBackups();
        errorMessage.value = '';
    } catch (error) {
        errorMessage.value = error.message || 'Could not load backups.';
    } finally {
        loading.value = false;
    }
}

async function createBackup() {
    if (creating.value) return;
    creating.value = true;
    dialogError.value = '';
    try {
        await window.api.createBackup(manualBackupName.value);
        createDialog.value = false;
        await refresh();
    } catch (error) {
        dialogError.value = error.message || 'Could not create the backup.';
    } finally {
        creating.value = false;
    }
}

function confirmRestore(backup) {
    dialogError.value = '';
    backupToRestore.value = backup;
}

function confirmDelete(backup) {
    dialogError.value = '';
    backupToDelete.value = backup;
}

function openRenameDialog(backup) {
    dialogError.value = '';
    backupToRename.value = backup;
    renamedBackupName.value = backupLabel(backup);
}

async function selectBackupForRestore() {
    try {
        const backup = await window.api.selectBackupForRestore();
        if (backup) confirmRestore(backup);
    } catch (error) {
        errorMessage.value = error.message || 'Could not select the backup.';
    }
}

async function restoreBackup() {
    dialogError.value = '';
    restoring.value = true;
    try {
        await window.api.restoreBackup(backupToRestore.value.path);
    } catch (error) {
        restoring.value = false;
        dialogError.value = error.message || 'Could not restore the backup.';
    }
}

async function deleteBackup() {
    deleting.value = true;
    dialogError.value = '';
    try {
        await window.api.deleteBackup(backupToDelete.value.id);
        backupToDelete.value = null;
        await refresh();
    } catch (error) {
        dialogError.value = error.message || 'Could not delete the backup.';
    } finally {
        deleting.value = false;
    }
}

async function renameBackup() {
    if (renaming.value) return;
    renaming.value = true;
    dialogError.value = '';
    try {
        await window.api.renameBackup(
            backupToRename.value.id,
            renamedBackupName.value,
        );
        backupToRename.value = null;
        await refresh();
    } catch (error) {
        dialogError.value = error.message || 'Could not rename the backup.';
    } finally {
        renaming.value = false;
    }
}

async function exportBackup(backup) {
    try {
        await window.api.exportBackup(backup.id);
    } catch (error) {
        errorMessage.value = error.message || 'Could not export the backup.';
    }
}

function revealBackup(backup) {
    window.api.revealBackup(backup.id);
}

onMounted(refresh);
</script>
