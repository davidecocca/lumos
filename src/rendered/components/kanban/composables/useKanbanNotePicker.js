// Manages note search, folder filtering, immediate link/unlink selection, and picker keyboard navigation.
import { computed, nextTick, ref, watch } from 'vue';

export function useKanbanNotePicker({ open, noteIds, notes, folders, disabled }) {
    const search = ref('');
    const searchInput = ref(null);
    const noteList = ref(null);
    const activeNoteIndex = ref(-1);
    const activeFolder = ref('linked');

    const folderId = (note) => {
        if (note.folder_id != null) return String(note.folder_id);
        // A running main process may still return the older options without IDs.
        if (note.folder_id === undefined && note.folder_name) {
            const matches = folders.value.filter(
                (folder) => folder.name === note.folder_name,
            );
            if (matches.length === 1) return String(matches[0].id);
            return undefined;
        }
    };
    const tokenizeSearch = (value) =>
        (value || '')
            .normalize('NFKD')
            .replace(/\p{M}/gu, '')
            .toLowerCase()
            .match(/[\p{L}\p{N}]+/gu) || [];
    const searchTerms = computed(() => tokenizeSearch(search.value));
    const searchQuery = computed(() => searchTerms.value.join(' '));
    const searchableNotes = computed(() =>
        notes.value.map((note) => ({
            note,
            words: tokenizeSearch(`${note.title} ${note.folder_name || ''}`),
        })),
    );
    const matchingNotes = computed(() =>
        searchableNotes.value
            .filter(({ words }) =>
                searchTerms.value.every((term) =>
                    words.some((word) => word.startsWith(term)),
                ),
            )
            .map(({ note }) => note),
    );
    const folderItems = computed(() => {
        const matchingFolderIds = new Set(matchingNotes.value.map(folderId));
        return folders.value
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((folder) => ({ ...folder, key: String(folder.id) }))
            .filter(
                (folder) => !searchQuery.value || matchingFolderIds.has(folder.key),
            );
    });
    const filteredNotes = computed(() =>
        matchingNotes.value.filter((note) =>
            activeFolder.value === 'linked'
                ? noteIds.value.includes(note.id)
                : folderId(note) === activeFolder.value,
        ),
    );
    const emptyStateText = computed(() => {
        if (searchQuery.value) return 'No matching notes.';
        if (activeFolder.value === 'linked')
            return 'No linked notes yet. Choose a folder to link notes.';
        return 'No notes in this folder.';
    });

    watch(open, (value) => {
        if (value) {
            search.value = '';
            activeFolder.value = 'linked';
            activeNoteIndex.value = -1;
        }
    });
    watch(filteredNotes, () => {
        activeNoteIndex.value = -1;
    });
    watch([searchQuery, folderItems], ([query, items], [previousQuery]) => {
        if (!query) {
            if (previousQuery) activeFolder.value = 'linked';
            return;
        }
        if (!items.some((folder) => folder.key === activeFolder.value)) {
            activeFolder.value = items[0]?.key || 'linked';
        }
    });

    async function moveActiveNote(direction) {
        if (!filteredNotes.value.length) return;
        activeNoteIndex.value =
            activeNoteIndex.value < 0
                ? direction > 0
                    ? 0
                    : filteredNotes.value.length - 1
                : (activeNoteIndex.value + direction + filteredNotes.value.length) %
                  filteredNotes.value.length;
        await nextTick();
        noteList.value?.$el
            .querySelectorAll('[role="option"]')
            [activeNoteIndex.value]?.scrollIntoView({ block: 'nearest' });
    }

    function toggleNote(note) {
        if (!note || disabled.value) return;
        noteIds.value = noteIds.value.includes(note.id)
            ? noteIds.value.filter((id) => id !== note.id)
            : [...noteIds.value, note.id];
        activeNoteIndex.value = -1;
        searchInput.value?.focus();
    }

    return {
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
    };
}
