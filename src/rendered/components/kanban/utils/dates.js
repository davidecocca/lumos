// Local dates, completion checks, due-date labels, and relative timestamps for Kanban.
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import { round } from 'javascript-time-ago/steps';
import { parseTimestamp } from '../../../utils/date.js';

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo('en-US');

export function toLocalDateString(date = new Date()) {
    return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseLocalDate(day) {
    // Parse date-only values in local time, never as UTC timestamps.
    return new Date(`${day}T12:00:00`);
}

// Format board and card timestamps as compact relative-time labels.
export function toRelativeTime(value, now = Date.now(), fallback = '') {
    const date = parseTimestamp(value);
    return date
        ? timeAgo.format(date, { labels: 'narrow', steps: round, now })
        : fallback;
}

export function isCardComplete(card, columns) {
    return columns.some(
        (column) =>
            column.id === card.columnId && column.progressType === 'complete',
    );
}

export function getCardDueDateDisplay(
    card,
    columns,
    today = toLocalDateString(),
) {
    if (!card.dueDate)
        return null;
    const date = parseLocalDate(card.dueDate);
    const formatted = date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        ...(card.dueDate.slice(0, 4) !== today.slice(0, 4)
            ? { year: 'numeric' }
            : {}),
    });
    const overdue = !isCardComplete(card, columns) && card.dueDate < today;
    if (overdue)
        return { label: `Overdue · ${formatted}`, color: 'error' };
    if (!isCardComplete(card, columns)) {
        if (card.dueDate === today)
            return { label: 'Today', color: 'warning' };
        const tomorrow = parseLocalDate(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (card.dueDate === toLocalDateString(tomorrow))
            return { label: 'Tomorrow', color: undefined };
    }
    return { label: formatted, color: undefined };
}
