import { describe, expect, it } from 'vitest';
import { getHiddenIndices } from '../src/layout.js';

describe('layout spacing', () => {
  it('reserves a gap between every visible item and the dropdown', () => {
    expect(getHiddenIndices([60, 60, 60], 180, 30, -1, 20)).toEqual([1, 2]);
  });

  it('does not add a trailing gap when all items fit exactly', () => {
    expect(getHiddenIndices([60, 60], 140, 30, -1, 20)).toEqual([]);
  });

  it('includes gaps when deciding if a priority item can fit', () => {
    expect(getHiddenIndices([80, 40], 100, 20, 0, 10)).toEqual([0, 1]);
  });
});
