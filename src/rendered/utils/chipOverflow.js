// Reserve room for the overflow chip whenever another item remains.
export function fittingChipCount(
    availableWidth,
    widths,
    overflowWidth,
    gap = 8,
) {
    let usedWidth = 0;
    let count = 0;
    for (const width of widths) {
        const neededWidth = usedWidth + (count ? gap : 0) + width;
        const withOverflow =
            count < widths.length - 1
                ? neededWidth + gap + overflowWidth
                : neededWidth;
        if (withOverflow > availableWidth) break;
        usedWidth = neededWidth;
        count++;
    }
    return count;
}
