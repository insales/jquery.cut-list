export function getHiddenIndices(
  widths,
  availableWidth,
  dropdownWidth,
  alwaysVisibleIndex = -1,
  gap = 0,
) {
  const itemsWidth = widths.reduce((total, width) => total + width, 0);
  const gapsWidth = Math.max(0, widths.length - 1) * gap;

  if (itemsWidth + gapsWidth <= availableWidth) {
    return [];
  }

  const keepPriority =
    alwaysVisibleIndex >= 0 && widths[alwaysVisibleIndex] + dropdownWidth + gap <= availableWidth;
  let usedWidth = dropdownWidth + (keepPriority ? widths[alwaysVisibleIndex] + gap : 0);
  let overflow = false;
  const hiddenIndices = [];

  for (const [index, width] of widths.entries()) {
    if (keepPriority && index === alwaysVisibleIndex) {
      continue;
    }

    usedWidth += width + gap;
    overflow = overflow || usedWidth > availableWidth;

    if (overflow) {
      hiddenIndices.push(index);
    }
  }

  return hiddenIndices;
}
