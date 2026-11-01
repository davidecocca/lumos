// Coordinates card opening, duplication, movement, deletion, and linked-note navigation with the draft.
import { ref } from 'vue';
import { copyCard, moveCard } from '../utils/cards.js';

export function useKanbanCardActions({
    board,
    noteOptions,
    persist,
    draft,
    cardDeleteDialog,
    dialogError,
}) {
    const deleteCardId = ref(null);
    const {
        cardDraft,
        panelColumnCards,
        panelCardIndex,
        openCard,
        flushPanelCard,
        resetCardPanel,
    } = draft;

    function onMoveCard({ cardId, columnId, beforeId }) {
        const cards = moveCard(board.value.cards, cardId, columnId, beforeId);
        if (JSON.stringify(cards) !== JSON.stringify(board.value.cards))
            return persist({ move: { cardId, columnId, beforeId } });
    }

    function duplicateCard(card) {
        const copy = copyCard(card);
        const savedIds = new Set(board.value.cards.map((item) => item.id));
        // Omit links to notes no longer available in this workspace.
        copy.noteIds = copy.noteIds.filter((id) =>
            noteOptions.value.some((note) => note.id === id),
        );
        const index = board.value.cards.findIndex(
            (item) => item.id === card.id,
        );
        const beforeId = board.value.cards[index + 1]?.id ?? null;
        return persist({ card: copy, beforeId }, (result) =>
            openCard(result.cards.find((item) => !savedIds.has(item.id))),
        );
    }

    async function duplicatePanelCard() {
        if (!(await flushPanelCard())) return;
        const card = board.value.cards.find(
            (card) => card.id === cardDraft.value.id,
        );
        if (card) return duplicateCard(card);
    }

    async function movePanelCard(direction) {
        if (!(await flushPanelCard())) return;
        const cards = panelColumnCards.value;
        const index = panelCardIndex.value;
        if (
            index < 0 ||
            index + direction < 0 ||
            index + direction >= cards.length
        )
            return;
        return onMoveCard({
            cardId: cardDraft.value.id,
            columnId: cardDraft.value.columnId,
            beforeId:
                direction < 0
                    ? cards[index - 1].id
                    : (cards[index + 2]?.id ?? null),
        });
    }

    function openCardDelete(card) {
        deleteCardId.value = card.id;
        dialogError.value = '';
        cardDeleteDialog.value = true;
    }

    function deleteCard() {
        const id = deleteCardId.value;
        return persist({ deleteCardId: id }, () => {
            cardDeleteDialog.value = false;
            if (cardDraft.value.id === id) resetCardPanel();
            deleteCardId.value = null;
        });
    }

    return {
        deleteCardId,
        onMoveCard,
        duplicateCard,
        duplicatePanelCard,
        movePanelCard,
        openCardDelete,
        deleteCard,
    };
}
