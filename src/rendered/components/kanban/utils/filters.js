// Filter Kanban cards by text, priority, tags, and completion-aware due dates.
import { extractDescriptionText } from './cards.js';
import { parseLocalDate, isCardComplete, toLocalDateString } from './dates.js';

export function filterCards(board, filters, today = toLocalDateString()) {
    const query = (filters.query || '').trim().toLowerCase();
    const weekStart = parseLocalDate(today);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const start = toLocalDateString(weekStart);
    const end = toLocalDateString(weekEnd);
    return board.cards.filter((card) => {
        if (
            query &&
            !`${card.title}\n${extractDescriptionText(card.description)}`
                .toLowerCase()
                .includes(query)
        )
            return false;
        if (filters.priority === 'none' && card.priority) return false;
        if (
            filters.priority &&
            filters.priority !== 'none' &&
            card.priority !== filters.priority
        )
            return false;
        if (
            filters.tags?.length &&
            !filters.tags.some((tag) =>
                card.tags?.some(
                    (value) => value.toLowerCase() === tag.toLowerCase(),
                ),
            )
        )
            return false;
        if (filters.due === 'none') return !card.dueDate;
        if (['overdue', 'today', 'week'].includes(filters.due)) {
            if (!card.dueDate || isCardComplete(card, board.columns))
                return false;
            if (filters.due === 'overdue') return card.dueDate < today;
            if (filters.due === 'today') return card.dueDate === today;

            return card.dueDate >= start && card.dueDate <= end;
        }
        return true;
    });
}
