<template>
    <v-card class="rounded-md border mt-4" title="Indexing" subtitle="Index your notes to enable semantic search." rounded="lg" elevation="0">
        <v-card-text class="mt-2">
            <v-sheet border rounded="lg" class="pa-4">
                <div class="d-flex align-center ga-3">
                    <v-icon :icon="statusIcon" :color="statusColor" size="small" />
                    <div class="flex-grow-1">
                        <div class="text-body-2 font-weight-medium">{{ statusTitle }}</div>
                        <div v-if="statusDetail" class="text-body-2 text-medium-emphasis mt-1">
                            {{ statusDetail }}
                        </div>
                    </div>
                    <v-btn
                        variant="text"
                        size="small"
                        prepend-icon="ph-hammer"
                        :disabled="!canRebuild"
                        :loading="rebuilding"
                        @click="rebuildDialog = true"
                    >
                        Rebuild index
                    </v-btn>
                </div>

                <v-progress-linear
                    v-if="status?.indexing"
                    class="mt-4"
                    indeterminate
                    color="primary"
                    height="2"
                    rounded
                />

                <div v-if="errorMessage" class="text-caption text-error mt-3">{{ errorMessage }}</div>
            </v-sheet>
        </v-card-text>

        <BaseDialog
            v-model="rebuildDialog"
            max-width="420"
            title="Rebuild index?"
            icon="ph-hammer"
        >
            All notes will be re-analyzed for semantic search. This runs in the background and does not modify note content.

            <template #actions>
                <v-spacer />
                <v-btn variant="text" @click="rebuildDialog = false">Cancel</v-btn>
                <v-btn color="primary" variant="tonal" @click="rebuildIndex">Rebuild</v-btn>
            </template>
        </BaseDialog>
    </v-card>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';

import BaseDialog from '../commons/BaseDialog.vue';

const status = ref(null);
const rebuilding = ref(false);
const rebuildDialog = ref(false);

let unsubscribe = null;

const errorMessage = computed(() => {
    if (!status.value) return null;
    if (!status.value.ready) {
        return status.value.error || 'The local embedding model is unavailable.';
    }
    return status.value.lastError || null;
});

const statusIcon = computed(() => {
    if (!status.value) return 'ph-circle-dashed';
    if (!status.value.ready) return 'ph-warning-circle';
    return status.value.indexing ? 'ph-arrows-clockwise' : 'ph-check-circle';
});

const statusColor = computed(() => {
    if (!status.value) return 'grey';
    if (!status.value.ready) return 'error';
    return status.value.indexing ? 'primary' : 'success';
});

const statusTitle = computed(() => {
    if (!status.value) return 'Checking index status…';
    const { ready, indexing } = status.value;

    if (!ready) return 'Semantic search is unavailable.';
    if (indexing) return 'Indexing notes…';
    return 'Up to date';
});

const statusDetail = computed(() => {
    if (!status.value) return null;
    const { ready, indexing, pending, indexedCount, totalNotes } = status.value;

    if (!ready) return null;
    if (indexing) {
        return pending > 0 ? `${pending} note${pending === 1 ? '' : 's'} remaining` : 'Working…';
    }
    return `${indexedCount} of ${totalNotes} note${totalNotes === 1 ? '' : 's'} indexed`;
});

const canRebuild = computed(() => Boolean(status.value?.ready) && !rebuilding.value);

async function refresh() {
    try {
        status.value = await window.api.getRagStatus();
    } catch {
        status.value = { ready: false, indexing: false, pending: 0 };
    }
}

async function rebuildIndex() {
    rebuildDialog.value = false;
    rebuilding.value = true;
    try {
        status.value = await window.api.rebuildRagIndex();
    } catch {
        // Status polling will surface the failure.
    } finally {
        rebuilding.value = false;
        refresh();
    }
}

onMounted(async () => {
    unsubscribe = window.api.onRagStatus((next) => {
        const wasIndexing = Boolean(status.value?.indexing);
        status.value = { ...status.value, ...next };
        if (wasIndexing && !next.indexing) {
            void refresh();
        }
    });
    await refresh();
});

onBeforeUnmount(() => {
    if (unsubscribe) unsubscribe();
});
</script>
