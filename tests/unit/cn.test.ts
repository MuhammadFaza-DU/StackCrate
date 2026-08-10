import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn() helper', () => {
  it('merges classes', () => {
    expect(cn('px-2', 'py-4')).toBe('px-2 py-4');
  });

  it('dedupes conflicting tailwind classes', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'extra')).toBe('base extra');
  });

  it('handles arrays and objects', () => {
    expect(cn(['px-2', 'py-4'], { 'font-bold': true, hidden: false })).toContain(
      'px-2'
    );
    expect(cn(['px-2', 'py-4'], { 'font-bold': true, hidden: false })).toContain(
      'font-bold'
    );
  });
});