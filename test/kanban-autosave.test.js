const test = require('node:test');
const assert = require('node:assert/strict');
const mountComposable = require('./helpers/mountComposable');

async function autosaveFixture(t) {
    const { ref } = await import('vue');
    const { useKanbanCardDraft } =
        await import('../src/rendered/components/kanban/composables/useKanbanCardDraft.js');
    const card = {
        id: 1,
        title: 'Card',
        columnId: 1,
        description: { type: 'doc', content: [] },
    };
    const board = ref({ cards: [card] });
    const disabled = ref(false);
    const busy = ref(false);
    const pending = [];
    const { result: actions, unmount } = await mountComposable(() =>
        useKanbanCardDraft({
            board,
            disabled,
            busy,
            dialogError: ref(''),
            persist: (changes, onSuccess) =>
                new Promise((resolve) => {
                    pending.push({
                        changes,
                        fail: () => resolve(false),
                        finish: () => {
                            const saved = [structuredClone(changes.card)];
                            saved[0].id ??= 2;
                            saved[0].updatedAt = '2026-10-09T12:00:00Z';
                            board.value.cards = saved;
                            onSuccess({ cards: saved });
                            resolve(true);
                        },
                    });
                }),
        }),
    );
    t.after(unmount);
    actions.openCard(card);
    return { actions, ...actions, pending, disabled, busy };
}

test('Kanban autosave preserves content typed while a save is pending', async (t) => {
    const { actions, cardDraft, cardSaving, pending } =
        await autosaveFixture(t);
    cardDraft.value.description.content.push({ type: 'paragraph' });
    const saving = actions.saveCard();
    assert.equal(cardSaving.value, true);
    cardDraft.value.description.content[0].content = [
        { type: 'text', text: 'Still typing' },
    ];
    assert.equal(
        pending[0].changes.card.description.content[0].content,
        undefined,
    );
    pending[0].finish();
    assert.equal(await saving, true);
    assert.equal(cardSaving.value, false);
    assert.equal(
        cardDraft.value.description.content[0].content[0].text,
        'Still typing',
    );
    assert.equal(actions.cardHasChanges(), true);

    const nextSave = actions.saveCard();
    pending[1].finish();
    await nextSave;
    assert.equal(actions.cardHasChanges(), false);
});

test('saving an unchanged draft updates timestamps without leaving it dirty', async (t) => {
    const { actions, cardDraft, pending } = await autosaveFixture(t);
    cardDraft.value.title = 'Edited title';
    const saving = actions.saveCard();
    pending[0].finish();
    await saving;
    assert.equal(cardDraft.value.updatedAt, '2026-10-09T12:00:00Z');
    assert.equal(actions.cardHasChanges(), false);
});

test('a close save keeps the panel open if new edits arrive during persistence', async (t) => {
    const { actions, cardDraft, cardPanel, pending } = await autosaveFixture(t);
    const saving = actions.saveCard({ close: true });
    cardDraft.value.title = 'New edit';
    pending[0].finish();
    await saving;
    assert.equal(cardPanel.value, true);
    assert.equal(actions.cardHasChanges(), true);
});

test('failed close keeps the draft open and available for retry', async (t) => {
    const { actions, cardDraft, cardPanel, pending } = await autosaveFixture(t);
    cardDraft.value.title = 'Unsaved title';
    const closing = actions.setCardPanel(false);
    pending[0].fail();
    await closing;
    assert.equal(cardPanel.value, true);
    assert.equal(cardDraft.value.title, 'Unsaved title');
    assert.equal(actions.cardHasChanges(), true);
    const retry = actions.setCardPanel(false);
    pending[1].finish();
    await retry;
    assert.equal(cardPanel.value, false);
});

test('closing flushes edits that arrive during its first save', async (t) => {
    const { actions, cardDraft, cardPanel, pending } = await autosaveFixture(t);
    cardDraft.value.title = 'First edit';
    const closing = actions.setCardPanel(false);
    cardDraft.value.title = 'Second edit';
    pending[0].finish();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(pending.length, 2);
    pending[1].finish();
    await closing;
    assert.equal(cardPanel.value, false);
    assert.equal(actions.cardHasChanges(), false);
});

test('autosave retains the 800ms debounce and resets cancel queued saves', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const { nextTick } = await import('vue');
    const { actions, cardDraft, pending } = await autosaveFixture(t);
    cardDraft.value.title = 'Edited';
    await nextTick();
    t.mock.timers.tick(799);
    assert.equal(pending.length, 0);
    t.mock.timers.tick(1);
    assert.equal(pending.length, 1);
    pending[0].finish();
    await nextTick();
    cardDraft.value.title = 'Next edit';
    await nextTick();
    actions.resetCardPanel();
    t.mock.timers.tick(800);
    assert.equal(pending.length, 1);
});

test('first save adopts its generated ID without losing edits typed while creating', async (t) => {
    const { actions, cardDraft, pending } = await autosaveFixture(t);
    actions.openCard(null, 1);
    cardDraft.value.title = 'New card';
    const creating = actions.saveCard();
    assert.equal(pending[0].changes.card.id, undefined);
    cardDraft.value.title = 'Still typing';
    pending[0].finish();
    await creating;
    assert.equal(cardDraft.value.id, 2);
    assert.equal(cardDraft.value.title, 'Still typing');
    const updating = actions.saveCard();
    assert.equal(pending[1].changes.card.id, 2);
    pending[1].finish();
    await updating;
    assert.equal(actions.cardHasChanges(), false);
});

test('failed first save retries without inventing a persisted ID', async (t) => {
    const { actions, cardDraft, pending } = await autosaveFixture(t);
    actions.openCard(null, 1);
    cardDraft.value.title = 'New card';
    const creating = actions.saveCard();
    pending[0].fail();
    assert.equal(await creating, false);
    assert.equal(cardDraft.value.id, undefined);
    const retry = actions.saveCard();
    pending[1].finish();
    await retry;
    assert.equal(cardDraft.value.id, 2);
    assert.equal(actions.cardHasChanges(), false);
});
