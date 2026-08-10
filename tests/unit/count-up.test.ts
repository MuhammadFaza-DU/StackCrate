import { describe, expect, it } from 'vitest';
import { getCountUpValue } from '@/lib/count-up';

describe('getCountUpValue', () => {
  it('interpolates a count and clamps progress to the animation range', () => {
    expect(getCountUpValue(0, 4, 0)).toBe(0);
    expect(getCountUpValue(0, 4, 0.5)).toBe(2);
    expect(getCountUpValue(0, 4, 1)).toBe(4);
    expect(getCountUpValue(0, 4, 2)).toBe(4);
    expect(getCountUpValue(0, 4, -1)).toBe(0);
  });
});
