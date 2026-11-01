const test = require('node:test');
const assert = require('node:assert/strict');

async function fixture({ editedId = 1, fail = false } = {}) {
    const { ref } = await import('vue');
    const { useKanbanCardActions } =
        await import('../src/rendered/components/kanban/composables/useKanbanCardActions.js');
    const board = ref({
        cards: [
            { id: 1, title: 'A', columnId: 1, tags: [], noteIds: [] },
            { id: 2, title: 'B', columnId: 2, tags: [], noteIds: [] },
        ],
    });
    for (const card of board.value.cards)
        card.description = { type: 'doc', content: [] };
    const cardDeleteDialog = ref(false);
    const dialogError = ref('Old error');
    const calls = [];
    let resets = 0;
    let opened;
    const actions = useKanbanCardActions({
        board,
        noteOptions: ref([]),
        cardDeleteDialog,
        dialogError,
        draft: {
            cardDraft: ref({ id: editedId }),
            openCard: (card) => {
                opened = card;
            },
            resetCardPanel: () => {
                resets++;
            },
        },
        persist: async (changes, onSuccess) => {
            calls.push(changes);
            if (fail) return false;
            if (changes.card) {
                const saved = { ...changes.card, id: 3 };
                const index = board.value.cards.findIndex(
                    (card) => card.id === changes.beforeId,
                );
                board.value.cards.splice(
                    index < 0 ? board.value.cards.length : index,
                    0,
                    saved,
                );
            } else
                board.value = {
                    cards: board.value.cards.filter(
                        (card) => card.id !== changes.deleteCardId,
                    ),
                };
            await onSuccess(board.value);
            return true;
        },
    });
    return {
        actions,
        board,
        cardDeleteDialog,
        dialogError,
        calls,
        resets: () => resets,
        opened: () => opened,
    };
}

test('card-menu deletion requests confirmation, then removes the card rather than its column', async () => {
    const { actions, board, cardDeleteDialog, dialogError, calls, resets } =
        await fixture();
    actions.openCardDelete(board.value.cards[0]);
    assert.equal(cardDeleteDialog.value, true);
    assert.equal(dialogError.value, '');
    assert.equal(calls.length, 0, 'opening confirmation does not write');
    await actions.deleteCard();
    assert.deepEqual(
        board.value.cards.map((card) => [card.id, card.columnId]),
        [[2, 2]],
    );
    assert.equal(cardDeleteDialog.value, false);
    assert.equal(resets(), 1, 'the deleted card panel is closed');
});

test('deleting a different board card does not close the currently edited card', async () => {
    const { actions, board, resets } = await fixture({ editedId: 2 });
    actions.openCardDelete(board.value.cards[0]);
    await actions.deleteCard();
    assert.equal(resets(), 0);
});

test('card duplication opens the generated card ID and keeps its insertion target', async () => {
    const { actions, board, calls, opened } = await fixture();
    await actions.duplicateCard(board.value.cards[0]);
    assert.equal(calls[0].card.id, undefined);
    assert.equal(calls[0].beforeId, 2);
    assert.equal(opened().id, 3);
    assert.equal(opened().title, 'A (copy)');
    assert.deepEqual(
        board.value.cards.map((card) => card.id),
        [1, 3, 2],
    );
});

test('failed card deletion retains confirmation and the saved board for retry', async () => {
    const { actions, board, cardDeleteDialog, resets } = await fixture({
        fail: true,
    });
    actions.openCardDelete(board.value.cards[0]);
    assert.equal(await actions.deleteCard(), false);
    assert.equal(board.value.cards.length, 2);
    assert.equal(cardDeleteDialog.value, true);
    assert.equal(resets(), 0);
});
