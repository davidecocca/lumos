<template>
    <v-card
        elevation="0"
        rounded="lg"
        height="180"
        class="border pa-4 d-flex flex-column"
        @click="openNote(props.note.id)"
    >
        <div class="d-flex align-center ga-2">
            <v-card-title
                class="pa-0 text-title-large font-weight-medium text-truncate flex-grow-1 flex-shrink-1"
                style="min-width: 0"
                :title="props.note.title"
            >
                {{ props.note.title }}
            </v-card-title>
            <div class="flex-shrink-0" @click.stop @keydown.stop>
                <NoteActionMenu
                    v-model="noteActionMenu"
                    :note="props.note"
                    visible
                    button-size="x-small"
                    button-density="comfortable"
                    button-class="text-medium-emphasis"
                    @toggle-favorite="store.toggleNoteFavorite"
                    @rename-note="store.openRenameNoteDialog"
                    @move-note="store.openMoveNoteDialog"
                    @delete-note="store.openDeleteNoteConfirmationDialog"
                />
            </div>
        </div>

        <v-card-text
            class="text-body-medium text-medium-emphasis pa-0 my-3 flex-grow-0 note-topic"
        >
            {{ props.note.topic || emptyNoteMessage }}
        </v-card-text>

        <div
            class="d-flex align-center ga-2 mt-auto text-body-small text-medium-emphasis"
        >
            <template v-if="props.note.folder_name">
                <v-icon icon="ph-folder-simple" size="18" />
                <span class="text-truncate" :title="props.note.folder_name">
                    {{ props.note.folder_name }}
                </span>
            </template>
            <v-spacer />
            <span
                v-if="props.showUpdatedAt && updatedAtLabel"
                class="text-no-wrap"
            >
                Updated {{ updatedAtLabel }}
            </span>
            <span
                v-if="props.showAccessedAt && lastViewedAtLabel"
                class="text-no-wrap"
            >
                Last opened {{ lastViewedAtLabel }}
            </span>
        </div>
    </v-card>
</template>

<script setup>
import NoteActionMenu from '../navbar/menus/NoteActionMenu.vue';
import { useFoldersStore } from '../../stores/foldersStore';
import { parseTimestamp } from '../../utils/date';

import { useRouter } from 'vue-router';
import { computed, ref } from 'vue';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import { round } from 'javascript-time-ago/steps';

const router = useRouter();
const store = useFoldersStore();
const noteActionMenu = ref(false);
const emptyNoteMessage = 'No content yet. Click to start writing.';

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo('en-US');
const relativeTimeStyle = {
    labels: 'narrow',
    steps: round,
};

const props = defineProps({
    note: {
        type: Object,
        required: true,
        prop: {
            id: Number,
            title: String,
            topic: String,
            favorite: Boolean,
            folder_name: String,
            updated_at: String,
            last_viewed_at: String,
        },
    },
    showUpdatedAt: {
        type: Boolean,
        default: false,
    },
    showAccessedAt: {
        type: Boolean,
        default: false,
    },
});

const formatRelativeTime = (value) => {
    const date = parseTimestamp(value);

    if (!date) {
        return '';
    }

    return timeAgo.format(date, relativeTimeStyle);
};

const updatedAtLabel = computed(() =>
    formatRelativeTime(props.note.updated_at),
);
const lastViewedAtLabel = computed(() =>
    formatRelativeTime(props.note.last_viewed_at),
);

const openNote = async (nodeId) => {
    await store.openNote(nodeId, router);
};
</script>

<style scoped>
.note-topic {
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
}
</style>
