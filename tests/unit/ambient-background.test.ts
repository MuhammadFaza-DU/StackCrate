import { describe, expect, it } from 'vitest';
import { getAmbientVariantClass } from '@/components/layout/AmbientBackground';

describe('getAmbientVariantClass', () => {
  it('maps every public page variant to a distinct ambient class', () => {
    expect(getAmbientVariantClass('home')).toBe('ambient-home');
    expect(getAmbientVariantClass('explore')).toBe('ambient-explore');
    expect(getAmbientVariantClass('favorites')).toBe('ambient-favorites');
    expect(getAmbientVariantClass('detail')).toBe('ambient-detail');
    expect(getAmbientVariantClass('auth')).toBe('ambient-auth');
    expect(getAmbientVariantClass('legal')).toBe('ambient-legal');
  });
});
