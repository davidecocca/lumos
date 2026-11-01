// Kanban display labels, colors, and icons for progress types and priorities.
export const PROGRESS_TYPES = [
    { title: 'Not started', value: 'not-started' },
    { title: 'Active', value: 'active' },
    { title: 'Blocked', value: 'blocked' },
    { title: 'Complete', value: 'complete' },
];

export const PROGRESS_TYPE_COLORS = {
    'not-started': undefined,
    active: 'primary',
    blocked: 'error',
    complete: 'secondary',
};

export const PROGRESS_TYPE_ICONS = {
    'not-started': 'ph-circle',
    active: 'ph-circle-half',
    blocked: 'ph-prohibit',
    complete: 'ph-check-circle',
};

export const PRIORITIES = [
    { title: 'Low', value: 'low', color: 'secondary', icon: 'ph-caret-down' },
    { title: 'Medium', value: 'medium', color: 'warning', icon: 'ph-equals' },
    { title: 'High', value: 'high', color: 'error', icon: 'ph-caret-up' },
    {
        title: 'Urgent',
        value: 'urgent',
        color: 'priority-urgent',
        icon: 'ph-caret-double-up',
    },
];
