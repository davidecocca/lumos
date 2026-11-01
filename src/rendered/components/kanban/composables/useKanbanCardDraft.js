// Manages the card draft, autosaving, and flushing pending changes before closing or switching cards.
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { createEmptyDescription } from '../utils/cards.js';

const CARD_AUTOSAVE_DEBOUNCE_MS = 800;

export function useKanbanCardDraft({
    board,
    disabled,
    busy,
    persist,
    dialogError,
}) {
    const cardDraft = ref({
        title: '',
        description: createEmptyDescription(),
        columnId: null,
    });
    const cardPanel = ref(false);
    const cardSaving = ref(false);
    let cardSaveTimer;
    let lastSavedCard = '';
    const panelColumnCards = computed(
        () =>
            board.value?.cards.filter(
                (card) => card.columnId === cardDraft.value.columnId,
            ) || [],
    );
    const panelCardIndex = computed(() =>
        panelColumnCards.value.findIndex(
            (card) => card.id === cardDraft.value.id,
        ),
    );

    function openCard(card, columnId) {
        cardDraft.value = card
            ? JSON.parse(JSON.stringify(card))
            : {
                  title: '',
                  description: createEmptyDescription(),
                  columnId,
                  dueDate: null,
                  priority: null,
                  tags: [],
                  noteIds: [],
              };
        lastSavedCard = card ? JSON.stringify(cardDraft.value) : '';
        dialogError.value = '';
        cardPanel.value = true;
    }

    function cardHasChanges() {
        return (
            cardDraft.value.title.trim() &&
            JSON.stringify(cardDraft.value) !== lastSavedCard
        );
    }

    function cancelScheduledSave() {
        clearTimeout(cardSaveTimer);
    }

    function scheduleCardSave() {
        cancelScheduledSave();
        if (!cardPanel.value || disabled.value || !cardHasChanges()) return;
        cardSaveTimer = setTimeout(() => {
            void saveCard();
        }, CARD_AUTOSAVE_DEBOUNCE_MS);
    }

    async function saveCard({ close = false } = {}) {
        if (disabled.value || !cardDraft.value.title.trim()) return false;
        const draft = JSON.parse(JSON.stringify(cardDraft.value));
        const savedIds = new Set(board.value.cards.map((card) => card.id));
        cardSaving.value = true;
        try {
            return await persist({ card: draft }, (result) => {
                const saved = result.cards.find((card) =>
                    draft.id != null
                        ? card.id === draft.id
                        : !savedIds.has(card.id),
                );
                if (JSON.stringify(cardDraft.value) === JSON.stringify(draft)) {
                    cardDraft.value = JSON.parse(JSON.stringify(saved));
                } else {
                    // Preserve pending edits while adopting the database ID and saved timestamps.
                    cardDraft.value.id = saved.id;
                    cardDraft.value.createdAt = saved.createdAt;
                    cardDraft.value.updatedAt = saved.updatedAt;
                    cardDraft.value.completedAt = saved.completedAt;
                }
                lastSavedCard = JSON.stringify(saved);
                if (close && !cardHasChanges()) cardPanel.value = false;
            });
        } finally {
            cardSaving.value = false;
        }
    }

    async function setCardPanel(open) {
        if (open) {
            cardPanel.value = true;
            return;
        }
        cancelScheduledSave();
        while (cardHasChanges()) {
            if (!(await saveCard())) return;
        }
        cardPanel.value = false;
    }

    async function flushPanelCard() {
        if (disabled.value || !cardDraft.value.title.trim()) return false;
        cancelScheduledSave();
        while (cardHasChanges()) {
            if (!(await saveCard())) return false;
        }
        return true;
    }

    function resetCardPanel() {
        cancelScheduledSave();
        cardPanel.value = false;
        lastSavedCard = '';
    }

    watch(cardDraft, scheduleCardSave, { deep: true });
    watch(busy, (saving) => {
        if (!saving) scheduleCardSave();
    });
    onBeforeUnmount(cancelScheduledSave);
    return {
        cardDraft,
        cardPanel,
        cardSaving,
        panelColumnCards,
        panelCardIndex,
        openCard,
        cardHasChanges,
        saveCard,
        setCardPanel,
        flushPanelCard,
        resetCardPanel,
    };
}
