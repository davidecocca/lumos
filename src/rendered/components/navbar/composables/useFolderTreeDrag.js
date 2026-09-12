import { ref } from 'vue';

export const useFolderTreeDrag = (moveNote) => {
    const draggingNoteId = ref(null);
    const draggedFromFolderId = ref(null);
    const dropTargetFolderId = ref(null);

    const resetDragState = () => {
        draggingNoteId.value = null;
        draggedFromFolderId.value = null;
        dropTargetFolderId.value = null;
    };

    const isValidDropTarget = (folderId) => {
        return (
            draggingNoteId.value !== null &&
            draggedFromFolderId.value !== null &&
            draggedFromFolderId.value !== folderId
        );
    };

    const handleNoteDragStart = (noteId, folderId, event) => {
        draggingNoteId.value = noteId;
        draggedFromFolderId.value = folderId;
        dropTargetFolderId.value = null;
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.dropEffect = 'move';
            event.dataTransfer.setData('text/plain', String(noteId));
        }
    };

    const handleNoteDragEnd = () => {
        resetDragState();
    };

    const handleFolderDragEnter = (folderId) => {
        if (!isValidDropTarget(folderId)) return;
        dropTargetFolderId.value = folderId;
    };

    const handleFolderDragOver = (folderId, event) => {
        if (!isValidDropTarget(folderId)) return;
        dropTargetFolderId.value = folderId;
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }
    };

    const handleFolderDragLeave = (folderId, event) => {
        if (event.currentTarget.contains(event.relatedTarget)) return;
        if (dropTargetFolderId.value === folderId) {
            dropTargetFolderId.value = null;
        }
    };

    const handleFolderDrop = async (folderId) => {
        if (!isValidDropTarget(folderId)) {
            resetDragState();
            return;
        }
        const noteId = draggingNoteId.value;
        const sourceFolderId = draggedFromFolderId.value;
        resetDragState();
        await moveNote(noteId, folderId, sourceFolderId, {
            revealTarget: true,
        });
    };

    return {
        draggingNoteId,
        dropTargetFolderId,
        handleNoteDragStart,
        handleNoteDragEnd,
        handleFolderDragEnter,
        handleFolderDragOver,
        handleFolderDragLeave,
        handleFolderDrop,
    };
};
