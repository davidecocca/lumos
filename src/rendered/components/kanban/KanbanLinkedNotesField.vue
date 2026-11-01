<template>
    <div>
        <BaseOverflowChipRow
            :items="selectedNotes"
            label="Linked notes"
            icon="ph-link"
            empty-text="No linked notes"
            add-label="Link a note"
            more-label="More linked notes"
            :disabled="disabled"
            clickable
            @add="pickerOpen = true"
            @click="openNote"
            @remove="unlinkNote($event.key)"
        >
            <template #overflow-label="{ count }"
                >{{ count }} more linked
                {{ count === 1 ? 'note' : 'notes' }}</template
            >
            <template #overflow="{ items }">
                <v-list-item
                    v-for="note in items"
                    :key="note.key"
                    :disabled="disabled"
                    rounded="lg"
                    min-height="36"
                    @click="openNote(note)"
                >
                    <template #prepend
                        ><v-icon
                            icon="ph-file"
                            size="18"
                            class="text-medium-emphasis"
                    /></template>
                    <v-list-item-title
                        class="text-body-small text-truncate"
                        :title="note.label"
                        >{{ note.label }}</v-list-item-title
                    >
                    <template #append>
                        <v-btn
                            icon
                            v-tooltip:top="'Unlink note'"
                            variant="text"
                            size="x-small"
                            density="comfortable"
                            rounded
                            :disabled="disabled"
                            :aria-label="`Unlink ${note.label}`"
                            @click.stop="unlinkNote(note.key)"
                        >
                            <v-icon icon="ph-x-circle" size="18" />
                        </v-btn>
                    </template>
                </v-list-item>
            </template>
        </BaseOverflowChipRow>
        <LinkNotesDialog
            v-model="pickerOpen"
            v-model:note-ids="noteIds"
            :notes="notes"
            :folders="folders"
            :disabled="disabled"
        />
    </div>
</template>

<script setup>
import { computed, ref } from 'vue';

import BaseOverflowChipRow from '../commons/BaseOverflowChipRow.vue';
import LinkNotesDialog from './dialogs/LinkNotesDialog.vue';

const noteIds = defineModel({ type: Array, default: () => [] });
const props = defineProps({
    notes: { type: Array, default: () => [] },
    folders: { type: Array, default: () => [] },
    canOpen: Boolean,
    disabled: Boolean,
});
const emit = defineEmits(['open-note']);
const pickerOpen = ref(false);
const selectedNotes = computed(() => {
    const notes = new Map(props.notes.map((note) => [note.id, note]));
    return noteIds.value.map((id) => {
        const note = notes.get(id);
        const label = note?.title || 'Unavailable note';
        return {
            key: id,
            label,
            unavailable: !note,
            chipProps: {
                title: note ? label : 'Deleted or moved out of this workspace',
            },
        };
    });
});
function openNote(note) {
    if (!note.unavailable && props.canOpen) emit('open-note', note.key);
}
function unlinkNote(id) {
    noteIds.value = noteIds.value.filter((noteId) => noteId !== id);
}
</script>
