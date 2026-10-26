import { describe, expect, it } from 'vitest';
import { getHiddenIndices } from '../src/layout.js';

describe('getHiddenIndices', () => {
  it.each([
    [[], 100, 20, []],
    [[30, 30], 100, 20, []],
    [[50, 50], 100, 20, []],
    [[40, 40, 40], 100, 20, [2]],
    [[40, 40, 40], 99, 20, [1, 2]],
    [[80, 10, 10], 90, 20, [0, 1, 2]],
    [[40, 40], 0, 20, [0, 1]],
    [[30.5, 30.5, 30.5], 81, 20, [2]],
  ])('lays out %j in %s pixels', (widths, available, dropdown, hidden) => {
    expect(getHiddenIndices(widths, available, dropdown)).toEqual(hidden);
  });

  it.each([0, 1, 2, 3])('keeps the priority item at index %s visible', (priority) => {
    const hidden = getHiddenIndices([40, 40, 40, 40], 100, 20, priority);
    expect(hidden).not.toContain(priority);
    expect(hidden).toHaveLength(2);
  });

  it('hides the priority item when it cannot fit with the dropdown', () => {
    expect(getHiddenIndices([100, 40], 100, 20, 0)).toEqual([0, 1]);
  });
});
