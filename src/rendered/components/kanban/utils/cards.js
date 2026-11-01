// Pure Kanban card transformations, committed tags, and rich-text description helpers.

// Move a card to a new column and position, returning the new array of cards.
export function moveCard(cards, cardId, columnId, beforeId = null) {
    const card = cards.find((item) => item.id === cardId);
    if (!card || beforeId === cardId)
        return cards;

    const remaining = cards.filter((item) => item.id !== cardId);
    const index =
        beforeId === null
            ? -1
            : remaining.findIndex(
                  (item) => item.id === beforeId && item.columnId === columnId,
              );
    remaining.splice(index < 0 ? remaining.length : index, 0, {
        ...card,
        columnId,
    });
    return remaining;
}

// Copy a card, returning a new card object with a modified title and cloned description.
export function copyCard(card) {
    return {
        title: `${card.title.slice(0, 233)} (copy)`,
        // Descriptions are JSON; structuredClone cannot clone Vue proxies.
        description: JSON.parse(JSON.stringify(card.description)),
        columnId: card.columnId,
        dueDate: card.dueDate ?? null,
        priority: card.priority ?? null,
        tags: [...(card.tags || [])],
        noteIds: [...(card.noteIds || [])],
    };
}

// Combobox search strings are not selections: only committed arrays add tags.
export function addCommittedTags(tags, values) {
    if (!Array.isArray(values) || !values.length)
        return tags;

    const result = [...tags];
    for (const value of values) {
        const tag = value.trim();
        if (
            tag &&
            !result.some((item) => item.toLowerCase() === tag.toLowerCase())
        )
            result.push(tag);
    }
    return result;
}

// Create an empty rich-text description, which is a ProseMirror document with a single paragraph node.
export const createEmptyDescription = () => ({
    type: 'doc',
    content: [{ type: 'paragraph' }],
});

// Convert a rich-text description to plain text, preserving line breaks.
export function extractDescriptionText(description) {
    if (!description)
        return '';

    const text = [];
    const visit = (node) => {
        if (node.type === 'text')
            text.push(node.text || '');
        if (node.type === 'hardBreak')
            text.push('\n');
        for (const child of node.content || [])
            visit(child);
        if (
            ['paragraph', 'heading', 'listItem', 'taskItem'].includes(
                node.type,
            ) &&
            text.length
        )
            text.push('\n');
    };
    visit(description);
    return text.join('').trim();
}
