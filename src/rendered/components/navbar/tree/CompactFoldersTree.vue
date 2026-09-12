<template>
    <v-divider class="mx-4 mb-2" />

    <!-- Main container -->
    <v-list density="compact" nav class="pt-0">
        <!-- Favorites -->
        <v-menu location="end" :close-on-content-click="false">
            <template v-slot:activator="{ props: menuProps }">
                <v-tooltip location="right" text="Favorites">
                    <template v-slot:activator="{ props: tooltipProps }">
                        <v-list-item
                            v-bind="{ ...menuProps, ...tooltipProps }"
                            rounded="lg"
                        >
                            <template v-slot:prepend>
                                <v-icon icon="ph-heart"></v-icon>
                            </template>
                        </v-list-item>
                    </template>
                </v-tooltip>
            </template>
            <v-list
                density="compact"
                nav
                width="350"
                max-width="calc(100vw - 72px)"
                max-height="800"
                rounded="lg"
                prepend-gap="8"
                class="pl-1 pr-1 pt-2 pb-2"
            >
                <v-list-item
                    min-height="32"
                    class="mb-1"
                    :ripple="false"
                    rounded="lg"
                >
                    <v-list-subheader
                        class="pa-0 text-medium-emphasis font-weight-medium"
                        >Favorites</v-list-subheader
                    >
                </v-list-item>
                <v-list-item
                    v-for="note in favoriteNotes"
                    :key="note.id"
                    :active="note.id === activeNoteId"
                    class="py-0"
                    min-height="36"
                    rounded="lg"
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
                <v-list-item
                    v-if="favoriteNotes.length === 0"
                    prepend-icon="ph-heart-break"
                    rounded="lg"
                >
                    <v-list-item-subtitle
                        >No favorite notes yet</v-list-item-subtitle
                    >
                </v-list-item>
            </v-list>
        </v-menu>

        <!-- Folders and notes -->
        <v-menu
            location="end"
            :close-on-content-click="false"
            @update:model-value="handleNoteDragEnd"
        >
            <template v-slot:activator="{ props: menuProps }">
                <v-tooltip location="right" text="Folders">
                    <template v-slot:activator="{ props: tooltipProps }">
                        <v-list-item
                            v-bind="{ ...menuProps, ...tooltipProps }"
                            rounded="lg"
                        >
                            <template v-slot:prepend>
                                <v-icon icon="ph-folder"></v-icon>
                            </template>
                        </v-list-item>
                    </template>
                </v-tooltip>
            </template>

            <!-- Folder tree -->
            <v-list
                density="compact"
                nav
                width="350"
                max-width="calc(100vw - 72px)"
                max-height="800"
                indent="0"
                prepend-gap="8"
                :opened="
                    folders
                        .filter((folder) => folder.isOpen)
                        .map((folder) => folder.id)
                "
                open-strategy="multiple"
                rounded="lg"
                class="pl-1 pr-1 pt-2 pb-2"
            >
                <v-list-item
                    min-height="32"
                    class="mb-1"
                    :ripple="false"
                    rounded="lg"
                >
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
                            class="py-0"
                            min-height="36"
                            rounded="lg"
                            :aria-expanded="isOpen"
                            :class="{
                                'drop-target-folder':
                                    dropTargetFolderId === folder.id,
                            }"
                            @mouseenter="
                                hoveredActionKey = getActionKey(
                                    'folder',
                                    folder.id,
                                )
                            "
                            @mouseleave="hoveredActionKey = null"
                            @click="store.toggleFolderOpen(folder)"
                            @dragenter.prevent="
                                handleFolderDragEnter(folder.id)
                            "
                            @dragover.prevent="
                                handleFolderDragOver(folder.id, $event)
                            "
                            @dragleave="
                                handleFolderDragLeave(folder.id, $event)
                            "
                            @drop.prevent="handleFolderDrop(folder.id)"
                        >
                            <template v-slot:prepend>
                                <div class="d-flex align-center ga-2">
                                    <v-icon
                                        :icon="
                                            isOpen
                                                ? 'ph-caret-down'
                                                : 'ph-caret-right'
                                        "
                                        size="16"
                                        class="text-medium-emphasis"
                                    />
                                    <v-icon
                                        :icon="
                                            isOpen
                                                ? 'ph-folder-open'
                                                : 'ph-folder'
                                        "
                                        size="20"
                                        class="text-medium-emphasis"
                                    />
                                </div>
                            </template>
                            <v-list-item-title class="font-weight-medium">{{
                                folder.name
                            }}</v-list-item-title>
                            <template v-slot:append>
                                <div class="d-flex align-center ga-2">
                                    <v-progress-circular
                                        v-if="folder.loading"
                                        size="20"
                                        indeterminate
                                    ></v-progress-circular>
                                    <FolderActionMenu
                                        :folder="folder"
                                        :visible="
                                            isActionVisible('folder', folder.id)
                                        "
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
                        </v-list-item>
                    </template>

                    <!-- Notes within folder -->
                    <v-list-item
                        v-for="note in folder.notes"
                        :key="note.id"
                        draggable="true"
                        :class="{ 'opacity-50': draggingNoteId === note.id }"
                        :active="note.id === activeNoteId"
                        class="py-0 ms-12"
                        min-height="36"
                        rounded="lg"
                        @mouseenter="
                            hoveredActionKey = getActionKey('note', note.id)
                        "
                        @mouseleave="hoveredActionKey = null"
                        @click="store.openNote(note.id, router)"
                        @dragstart="
                            handleNoteDragStart(note.id, folder.id, $event)
                        "
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
                                    'font-weight-medium':
                                        note.id === activeNoteId,
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
                                @delete-note="
                                    store.openDeleteNoteConfirmationDialog
                                "
                            />
                        </template>
                    </v-list-item>
                    <v-list-item
                        v-if="folder.notes.length === 0 && !folder.loading"
                        class="ms-12"
                        rounded="lg"
                    >
                        <v-list-item-subtitle
                            >No notes yet</v-list-item-subtitle
                        >
                    </v-list-item>
                </v-list-group>
                <v-list-item v-if="folders.length === 0" rounded="lg">
                    <v-list-item-subtitle>No folders yet</v-list-item-subtitle>
                </v-list-item>
            </v-list>
        </v-menu>
    </v-list>
</template>

<script setup>
import { useFolderTreeActions } from '../composables/useFolderTreeActions';
import { useFolderTreeDrag } from '../composables/useFolderTreeDrag';
import FolderActionMenu from '../menus/FolderActionMenu.vue';
import NoteActionMenu from '../menus/NoteActionMenu.vue';

import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useFoldersStore } from '../../../stores/foldersStore';

const router = useRouter();
const store = useFoldersStore();

const folders = computed(() => store.folders);
const favoriteNotes = computed(() => store.favoriteNotes);
const activeNoteId = computed(() => store.activeNoteId);
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
