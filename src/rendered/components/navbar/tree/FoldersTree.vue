<template>
    <v-divider class="mx-4 mb-2" />

    <!-- Main container -->
    <v-list
    v-if="favoriteNotes.length > 0"
    nav
    density="compact"
    class="ps-2 pe-4 pt-0 pb-2"
    prepend-gap="8"
    >
    <!-- Favorites -->
        <v-list-item
            min-height="32"
            class="mb-1"
            rounded="lg"
            :aria-expanded="favoritesOpen"
            aria-controls="sidebar-favorite-notes"
            @click="favoritesOpen = !favoritesOpen"
        >
            <v-list-subheader
                class="pa-0 text-medium-emphasis font-weight-medium"
                >Favorites</v-list-subheader
            >
            <template v-slot:append>
                <v-sheet
                    width="20"
                    height="20"
                    color="transparent"
                    rounded
                    class="d-flex align-center justify-center"
                >
                    <v-icon
                        :icon="
                            favoritesOpen ? 'ph-caret-down' : 'ph-caret-right'
                        "
                        size="16"
                        class="text-medium-emphasis"
                    />
                </v-sheet>
            </template>
        </v-list-item>

        <v-expand-transition>
            <div v-show="favoritesOpen" id="sidebar-favorite-notes">
                <v-list-item
                    v-for="(note, k) in favoriteNotes"
                    :key="k"
                    :active="
                        note.id === activeNoteId && !activeNoteIsVisibleInTree
                    "
                    rounded="lg"
                    min-height="36"
                    class="py-0"
                    @mouseenter="
                        hoveredActionKey = getActionKey(
                            'favorite-note',
                            note.id,
                        )
                    "
                    @mouseleave="hoveredActionKey = null"
                    @click="store.openNote(note.id, router)"
                >
                    <template v-slot:prepend>
                        <v-icon
                            icon="ph-file"
                            size="20"
                            class="text-medium-emphasis opacity-100"
                        />
                    </template>
                    <template v-slot:title>
                        <span
                            :class="{
                                'font-weight-medium': note.id === activeNoteId,
                            }"
                            >{{ note.title }}</span
                        >
                    </template>
                    <template v-slot:append>
                        <NoteActionMenu
                            :note="note"
                            quick-favorite
                            :visible="isActionVisible('favorite-note', note.id)"
                            :model-value="
                                activeActionMenuKey ===
                                getActionKey('favorite-note', note.id)
                            "
                            @update:model-value="
                                setActionMenuOpen(
                                    'favorite-note',
                                    note.id,
                                    $event,
                                )
                            "
                            @toggle-favorite="store.toggleNoteFavorite"
                            @rename-note="store.openRenameNoteDialog"
                            @move-note="store.openMoveNoteDialog"
                            @delete-note="
                                store.openDeleteNoteConfirmationDialog
                            "
                        />
                    </template>
                </v-list-item>
            </div>
        </v-expand-transition>
    </v-list>

    <v-divider v-if="favoriteNotes.length > 0" class="mx-4 mb-2" />

    <!-- Folders -->
    <v-list
        nav
        density="compact"
        class="ps-2 pe-4 pt-0 pb-2"
        indent="0"
        prepend-gap="8"
        :opened="
            folders.filter((folder) => folder.isOpen).map((folder) => folder.id)
        "
        open-strategy="multiple"
    >
        <v-list-item min-height="32" class="mb-1" :ripple="false">
            <v-list-subheader
                class="pa-0 text-medium-emphasis font-weight-medium"
                >Folders</v-list-subheader
            >

            <template v-slot:append>
                <div class="d-flex align-center">
                    <v-tooltip text="New folder" location="top">
                        <template v-slot:activator="{ props }">
                            <v-btn
                                v-bind="props"
                                icon="ph-plus"
                                aria-label="New folder"
                                variant="text"
                                size="small"
                                density="compact"
                                class="text-medium-emphasis"
                                rounded
                                @click="store.openCreateFolderDialog()"
                            />
                        </template>
                    </v-tooltip>
                </div>
            </template>
        </v-list-item>

        <!-- Folder tree -->
        <v-list-group
            v-for="folder in folders"
            :key="folder.id"
            :value="folder.id"
            fluid
            class="mb-1"
        >
            <template v-slot:activator="{ props, isOpen }">
                <v-list-item
                    v-bind="props"
                    rounded="lg"
                    min-height="36"
                    class="py-0"
                    :aria-expanded="isOpen"
                    :class="{
                        'drop-target-folder': dropTargetFolderId === folder.id,
                    }"
                    @mouseenter="
                        hoveredActionKey = getActionKey('folder', folder.id)
                    "
                    @mouseleave="hoveredActionKey = null"
                    @click="store.toggleFolderOpen(folder)"
                    @dragenter.prevent="handleFolderDragEnter(folder.id)"
                    @dragover.prevent="handleFolderDragOver(folder.id, $event)"
                    @dragleave="handleFolderDragLeave(folder.id, $event)"
                    @drop.prevent="handleFolderDrop(folder.id)"
                >
                    <template v-slot:prepend>
                        <div class="d-flex align-center ga-2">
                            <v-icon
                                :icon="
                                    isOpen ? 'ph-caret-down' : 'ph-caret-right'
                                "
                                size="16"
                                class="text-medium-emphasis"
                            />
                            <v-icon
                                :icon="isOpen ? 'ph-folder-open' : 'ph-folder'"
                                size="20"
                                class="text-medium-emphasis"
                            />
                        </div>
                    </template>
                    <template v-slot:append>
                        <div class="d-flex align-center ga-2">
                            <div v-if="folder.loading" class="mr-2">
                                <v-progress-circular
                                    size="20"
                                    indeterminate
                                ></v-progress-circular>
                            </div>
                            <FolderActionMenu
                                :folder="folder"
                                :visible="isActionVisible('folder', folder.id)"
                                :model-value="
                                    activeActionMenuKey ===
                                    getActionKey('folder', folder.id)
                                "
                                @update:model-value="
                                    setActionMenuOpen(
                                        'folder',
                                        folder.id,
                                        $event,
                                    )
                                "
                            />
                        </div>
                    </template>
                    <v-list-item-title class="font-weight-medium">{{
                        folder.name
                    }}</v-list-item-title>
                </v-list-item>
            </template>

            <!-- Notes within folder -->
            <v-list-item
                v-for="(note, k) in folder.notes"
                :key="k"
                :draggable="true"
                rounded="lg"
                min-height="36"
                class="py-0 ms-12"
                :class="{ 'opacity-50': draggingNoteId === note.id }"
                :active="note.id === activeNoteId"
                @mouseenter="hoveredActionKey = getActionKey('note', note.id)"
                @mouseleave="hoveredActionKey = null"
                @click="store.openNote(note.id, router)"
                @dragstart="handleNoteDragStart(note.id, folder.id, $event)"
                @dragend="handleNoteDragEnd"
            >
                <template v-slot:prepend>
                    <v-icon
                        icon="ph-file"
                        size="20"
                        class="text-medium-emphasis opacity-100"
                    />
                </template>
                <template v-slot:title>
                    <span
                        :class="{
                            'font-weight-medium': note.id === activeNoteId,
                        }"
                        >{{ note.title }}</span
                    >
                </template>
                <template v-slot:append>
                    <NoteActionMenu
                        :note="note"
                        quick-favorite
                        :visible="isActionVisible('note', note.id)"
                        :model-value="
                            activeActionMenuKey ===
                            getActionKey('note', note.id)
                        "
                        @update:model-value="
                            setActionMenuOpen('note', note.id, $event)
                        "
                        @toggle-favorite="store.toggleNoteFavorite"
                        @rename-note="store.openRenameNoteDialog"
                        @move-note="store.openMoveNoteDialog"
                        @delete-note="store.openDeleteNoteConfirmationDialog"
                    />
                </template>
            </v-list-item>
            <v-list-item
                v-if="folder.notes.length === 0 && !folder.loading"
                class="ms-12"
            >
                <v-list-item-subtitle>No notes yet</v-list-item-subtitle>
            </v-list-item>
        </v-list-group>
        <v-list-item v-if="folders.length === 0">
            <v-list-item-subtitle>No folders yet</v-list-item-subtitle>
        </v-list-item>
    </v-list>
</template>

<script setup>
import { useFolderTreeActions } from '../composables/useFolderTreeActions';
import { useFolderTreeDrag } from '../composables/useFolderTreeDrag';
import FolderActionMenu from '../menus/FolderActionMenu.vue';
import NoteActionMenu from '../menus/NoteActionMenu.vue';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useFoldersStore } from '../../../stores/foldersStore';

// Get the router and the Pinia store instance
const router = useRouter();
const store = useFoldersStore();
const favoritesOpen = ref(true);

// Map store state to local computed refs
const folders = computed(() => store.folders);
const favoriteNotes = computed(() => store.favoriteNotes);
const activeNoteId = computed(() => store.activeNoteId);
const activeNoteIsVisibleInTree = computed(() =>
    folders.value.some(
        (folder) =>
            folder.isOpen &&
            folder.notes.some((note) => note.id === activeNoteId.value),
    ),
);
const {
    hoveredActionKey,
    activeActionMenuKey,
    getActionKey,
    setActionMenuOpen,
    isActionVisible,
} = useFolderTreeActions();
const {
    draggingNoteId,
    dropTargetFolderId,
    handleNoteDragStart,
    handleNoteDragEnd,
    handleFolderDragEnter,
    handleFolderDragOver,
    handleFolderDragLeave,
    handleFolderDrop,
} = useFolderTreeDrag((...args) => store.moveNote(...args));
</script>

<style scoped>
.drop-target-folder {
    background: rgba(15, 23, 42, 0.06);
    outline: 2px dashed rgba(15, 23, 42, 0.2);
    outline-offset: -2px;
}

.v-theme--dark .drop-target-folder {
    background: rgba(255, 255, 255, 0.08);
    outline-color: rgba(255, 255, 255, 0.2);
}
</style>
