export const parseTimestamp = (value) => {
    if (!value) {
        return null;
    }

    const normalizedValue =
        typeof value === 'string' &&
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
            ? `${value.replace(' ', 'T')}Z`
            : value;
    const date = new Date(normalizedValue);

    return Number.isNaN(date.getTime()) ? null : date;
};
