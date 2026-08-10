import type { MetadataRoute } from 'next';
import type { Locale } from '@/i18n/types';

export function getPwaManifest(locale: Locale): MetadataRoute.Manifest {
  const isEnglish = locale === 'en';

  return {
    name: isEnglish ? 'StackCrate - Asset Library' : 'StackCrate - Pustaka Asset',
    short_name: 'StackCrate',
    description: isEnglish
      ? 'Audio and video assets for creators.'
      : 'Asset audio dan video untuk kreator.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#f97316',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/favicon.svg',
        type: 'image/svg+xml',
        sizes: 'any',
        purpose: 'any',
      },
    ],
  };
}
