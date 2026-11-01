<template>
    <BaseDialog
        v-model="open"
        title="Link notes"
        subtitle="Select notes to link to this card."
        icon="ph-link"
        :max-width="720"
        :height="600"
        card-class="d-flex flex-column overflow-hidden h-100"
        content-class="d-flex flex-column flex-grow-1 h-0 overflow-hidden px-6 pb-4"
        @after-enter="searchInput?.focus()"
    >
        <!-- Search input -->
        <div class="flex-shrink-0">
            <v-text-field
                ref="searchInput"
                v-model="search"
                placeholder="Search..."
                aria-label="Search notes"
                role="combobox"
                aria-autocomplete="list"
                clearable
                clear-icon="ph-x"
                :aria-expanded="open"
                :aria-controls="noteListId"
                :aria-activedescendant="
                    activeNoteIndex >= 0 && filteredNotes.length
                        ? `${noteListId}-${activeNoteIndex}`
                        : undefined
                "
                prepend-icon="ph-magnifying-glass"
                variant="text"
                density="comfortable"
                rounded="lg"
                hide-details
                :disabled="disabled"
                @keydown.down.prevent.stop="moveActiveNote(1)"
                @keydown.up.prevent.stop="moveActiveNote(-1)"
                @keydown.enter.prevent.stop="
                    !$event.isComposing &&
                    toggleNote(filteredNotes[activeNoteIndex])
                "
            />
            <v-divider />
        </div>

        <!-- Two-pane browser: folders on the left, notes on the right -->
        <v-row
            no-gutters
            class="flex-column flex-sm-row flex-nowrap ga-4 flex-1-1 mt-4"
            style="min-height: 0"
        >
            <!-- Folder list -->
            <v-col
                cols="auto"
                class="kanban-note-picker__folder-column"
                style="min-height: 0; width: 100%"
            >
                <v-list
                    nav
                    density="compact"
                    class="kanban-note-picker__folders d-flex d-sm-block ga-1 h-100 overflow-auto pa-0"
                    bg-color="pa-0 transparent"
                    prepend-gap="8"
                >
                    <v-list-item
                        title="Linked notes"
                        prepend-icon="ph-link"
                        :active="activeFolder === 'linked'"
                        rounded="lg"
                        @click="activeFolder = 'linked'"
                    />
                    <v-list-item
                        v-for="folder in folderItems"
                        :key="folder.id"
                        :title="folder.name"
                        :active="activeFolder === folder.key"
                        prepend-icon="ph-folder"
                        rounded="lg"
                        @click="activeFolder = folder.key"
                    />
                </v-list>
            </v-col>

            <!-- Note list -->
            <v-col
                class="d-flex flex-column flex-1-1"
                style="min-height: 0; min-width: 0"
            >
                <v-list
                    :id="noteListId"
                    ref="noteList"
                    role="listbox"
                    aria-label="Workspace notes"
                    aria-multiselectable="true"
                    nav
                    density="compact"
                    class="h-100 overflow-y-auto flex-1-1 pa-0"
                    style="min-height: 0"
                    bg-color="transparent"
                >
                    <v-list-item
                        v-for="(note, index) in filteredNotes"
                        :id="`${noteListId}-${index}`"
                        :key="note.id"
                        :title="note.title"
                        :active="index === activeNoteIndex"
                        :aria-selected="noteIds.includes(note.id)"
                        :disabled="disabled"
                        role="option"
                        tabindex="-1"
                        rounded="lg"
                        @click="toggleNote(note)"
                    >
                        <template #subtitle>
                            <div class="d-flex align-center ga-1">
                                <v-icon
                                    icon="ph-folder-simple"
                                    size="x-small"
                                />
                                <span class="text-truncate">{{
                                    note.folder_name
                                }}</span>
                            </div>
                        </template>
                        <template #append>
                            <v-icon
                                v-if="noteIds.includes(note.id)"
                                icon="ph-check"
                                size="small"
                            />
                        </template>
                    </v-list-item>
                    <v-list-item
                        v-if="!filteredNotes.length"
                        class="text-body-small text-medium-emphasis"
                        rounded="lg"
                        role="status"
                    >
                        {{ emptyStateText }}
                    </v-list-item>
                </v-list>
            </v-col>
        </v-row>

        <!-- Footer: actions -->
        <template #actions>
            <span class="text-body-small text-medium-emphasis" role="status">
                {{ noteIds.length }}
                {{ noteIds.length === 1 ? 'note selected' : 'notes selected' }}
            </span>
            <v-spacer />
            <v-btn variant="text" @click="open = false">Close</v-btn>
            <v-btn color="primary" variant="tonal" @click="open = false"
                >Done</v-btn
            >
        </template>
    </BaseDialog>
</template>

<script setup>
import { toRefs, useId } from 'vue';

import BaseDialog from '../../commons/BaseDialog.vue';
import { useKanbanNotePicker } from '../composables/useKanbanNotePicker.js';

const open = defineModel({ type: Boolean, default: false });
const noteIds = defineModel('noteIds', { type: Array, default: () => [] });
const props = defineProps({
    notes: { type: Array, default: () => [] },
    folders: { type: Array, default: () => [] },
    disabled: Boolean,
});
const noteListId = `kanban-note-picker-${useId()}`;
const {
    search,
    searchInput,
    noteList,
    activeNoteIndex,
    activeFolder,
    folderItems,
    filteredNotes,
    emptyStateText,
    moveActiveNote,
    toggleNote,
} = useKanbanNotePicker({ open, noteIds, ...toRefs(props) });
</script>

<style scoped>
/* Preserve header wrapping and shrink constraints inside the fixed-height dialog. */
:deep(.v-card-title > div:not(.v-avatar)) {
    min-width: 0;
}
:deep(.v-card-title .text-label-large) {
    white-space: normal;
}
/* Keep the existing folder width rather than using a proportional grid column. */
@media (min-width: 600px) {
    .kanban-note-picker__folder-column {
        max-width: 176px;
    }
}
@media (max-width: 599.98px) {
    .kanban-note-picker__folders :deep(.v-list-item) {
        flex-shrink: 0;
        margin-bottom: 0;
    }
}
</style>
