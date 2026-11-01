const test = require('node:test');
const assert = require('node:assert/strict');
const mountComposable = require('./helpers/mountComposable');

async function createPicker(t) {
    const { ref } = await import('vue');
    const { useKanbanNotePicker } = await import(
        '../src/rendered/components/kanban/composables/useKanbanNotePicker.js'
    );
    const inputs = {
        open: ref(false),
        noteIds: ref([1]),
        disabled: ref(false),
        folders: ref([
            { id: 20, name: 'Work' },
            { id: 10, name: 'Personal' },
        ]),
        notes: ref([
            { id: 1, title: 'Café ideas', folder_id: 10, folder_name: 'Personal' },
            { id: 2, title: 'Release plan', folder_id: 20, folder_name: 'Work' },
            { id: 3, title: 'Release checklist', folder_id: 20, folder_name: 'Work' },
        ]),
    };
    const { result: picker, unmount } = await mountComposable(() =>
        useKanbanNotePicker(inputs),
    );
    t.after(unmount);
    return { picker, inputs };
}

test('note picker preserves linked filtering and normalized word-prefix search', async (t) => {
    const { nextTick } = await import('vue');
    const { picker, inputs } = await createPicker(t);
    assert.deepEqual(picker.filteredNotes.value.map((note) => note.id), [1]);
    assert.deepEqual(picker.folderItems.value.map((folder) => folder.id), [10, 20]);

    picker.search.value = 'CAFE, ide';
    await nextTick();
    assert.equal(picker.activeFolder.value, '10');
    assert.deepEqual(picker.filteredNotes.value.map((note) => note.id), [1]);

    picker.search.value = 'rel wor';
    await nextTick();
    assert.equal(picker.activeFolder.value, '20');
    assert.deepEqual(picker.filteredNotes.value.map((note) => note.id), [2, 3]);
    assert.deepEqual(picker.folderItems.value.map((folder) => folder.id), [20]);

    inputs.notes.value = inputs.notes.value.filter((note) => note.id !== 2);
    assert.deepEqual(picker.filteredNotes.value.map((note) => note.id), [3]);

    picker.search.value = 'missing';
    await nextTick();
    assert.deepEqual(picker.filteredNotes.value, []);
    assert.equal(picker.emptyStateText.value, 'No matching notes.');

    picker.search.value = '';
    await nextTick();
    assert.equal(picker.activeFolder.value, 'linked');
});

test('note picker updates selection immediately and respects disabled state', async (t) => {
    const { picker, inputs } = await createPicker(t);
    let focuses = 0;
    picker.searchInput.value = { focus: () => focuses++ };
    picker.toggleNote(inputs.notes.value[1]);
    assert.deepEqual(inputs.noteIds.value, [1, 2]);
    picker.toggleNote(inputs.notes.value[0]);
    assert.deepEqual(inputs.noteIds.value, [2]);
    assert.equal(focuses, 2);

    inputs.disabled.value = true;
    picker.toggleNote(inputs.notes.value[1]);
    picker.toggleNote(undefined);
    assert.deepEqual(inputs.noteIds.value, [2]);
    assert.equal(focuses, 2);
});

test('note picker wraps keyboard navigation, scrolls the active item, and resets on reopen', async (t) => {
    const { nextTick } = await import('vue');
    const { picker, inputs } = await createPicker(t);
    picker.activeFolder.value = '20';
    await nextTick();
    const scrolled = [];
    picker.noteList.value = {
        $el: {
            querySelectorAll: (selector) => {
                assert.equal(selector, '[role="option"]');
                return [0, 1].map((index) => ({
                    scrollIntoView: () => scrolled.push(index),
                }));
            },
        },
    };
    await picker.moveActiveNote(-1);
    assert.equal(picker.activeNoteIndex.value, 1);
    await picker.moveActiveNote(1);
    assert.equal(picker.activeNoteIndex.value, 0);
    await picker.moveActiveNote(1);
    assert.equal(picker.activeNoteIndex.value, 1);
    assert.deepEqual(scrolled, [1, 0, 1]);

    picker.search.value = 'release';
    await nextTick();
    inputs.open.value = true;
    await nextTick();
    assert.equal(picker.search.value, '');
    assert.equal(picker.activeFolder.value, 'linked');
    assert.equal(picker.activeNoteIndex.value, -1);
    assert.deepEqual(inputs.noteIds.value, [1]);
});
