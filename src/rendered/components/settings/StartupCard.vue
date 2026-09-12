<template>
    <v-card
        class="border"
        title="Startup"
        subtitle="Pick up where you left off, or start fresh."
        rounded="lg"
        elevation="0"
    >
        <v-card-text>
            <div class="d-flex align-center ga-2">
                <v-icon size="large">ph-tabs</v-icon>
                <p class="text-subtitle-2">Restore previous tabs</p>
                <v-spacer />
                <v-switch
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
        </v-card-text>
    </v-card>
</template>

<script setup>
import { useTabsStore } from '../../stores/tabsStore';

const tabsStore = useTabsStore();
</script>
