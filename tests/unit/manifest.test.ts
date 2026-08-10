import { describe, expect, it } from 'vitest';
import { getPwaManifest } from '@/lib/pwa-manifest';

describe('PWA manifest localization', () => {
  it('uses Indonesian install metadata', () => {
    const manifest = getPwaManifest('id');

    expect(manifest.name).toBe('StackCrate - Pustaka Asset');
    expect(manifest.description).toBe('Asset audio dan video untuk kreator.');
  });

  it('uses English install metadata', () => {
    const manifest = getPwaManifest('en');

    expect(manifest.name).toBe('StackCrate - Asset Library');
    expect(manifest.description).toBe('Audio and video assets for creators.');
  });

  it('provides the StackCrate favicon for installation', () => {
    const manifest = getPwaManifest('en');

    expect(manifest.icons).toEqual([
      {
        src: '/favicon.svg',
        type: 'image/svg+xml',
        sizes: 'any',
        purpose: 'any',
      },
    ]);
  });
});
