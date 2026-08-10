import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_LOCALE, getDictionary, LOCALE_COOKIE, SUPPORTED_LOCALES } from '@/i18n/config';
import { getLocaleFromCookieValue, formatCount, formatMessage } from '@/i18n/server';
import { LocaleProvider, useLocale } from '@/components/i18n/LocaleProvider';
import { LocaleSwitcher } from '@/components/i18n/LocaleSwitcher';
import type { Message } from '@/i18n/types';

const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const resolveMessage = (message: Message) => typeof message === 'function' ? message() : message;

function LocaleProbe() {
  const { locale, setLocale } = useLocale();

  return createElement(
    'button',
    { type: 'button', onClick: () => setLocale(locale === 'id' ? 'en' : 'id') },
    locale,
  );
}

describe('i18n core', () => {
  it('falls back to Indonesian for missing or unsupported locales', () => {
    expect(LOCALE_COOKIE).toBe('locale');
    expect(getLocaleFromCookieValue(undefined)).toBe(DEFAULT_LOCALE);
    expect(getLocaleFromCookieValue('fr')).toBe(DEFAULT_LOCALE);
    expect(getLocaleFromCookieValue('en')).toBe('en');
    expect(SUPPORTED_LOCALES).toEqual(['id', 'en']);
  });

  it('accepts only supported locales and persists locale changes for one year', async () => {
    expect(SUPPORTED_LOCALES).toEqual(['id', 'en']);
    expect(LOCALE_COOKIE).toBe('locale');

    const cookieSetter = vi.spyOn(document, 'cookie', 'set');
    const container = document.createElement('div');
    const root = createRoot(container);
    document.body.appendChild(container);

    await act(async () => {
      root.render(
        createElement(
          LocaleProvider,
          { initialLocale: 'id' },
          createElement(LocaleProbe),
        ),
      );
    });

    await act(async () => {
      container.querySelector('button')?.click();
    });

    expect(container.querySelector('button')?.textContent).toBe('en');
    expect(cookieSetter).toHaveBeenCalledWith(
      'locale=en; path=/; max-age=31536000; samesite=lax',
    );
    expect(refreshMock).toHaveBeenCalledOnce();

    await act(async () => {
      root.unmount();
    });
    container.remove();
    cookieSetter.mockRestore();
    vi.clearAllMocks();
  });

  it('returns the English dictionary for the supported English locale', () => {
    expect(getDictionary('en').header.login).toBe('Sign in');
    expect(getDictionary('id').header.login).toBe('Masuk');
  });

  it('provides locale-specific legal update dates', () => {
    expect(getDictionary('id').legal.lastUpdatedDate).toBe('10 Agustus 2026');
    expect(getDictionary('en').legal.lastUpdatedDate).toBe('August 10, 2026');
  });

  it('provides localized privacy metadata descriptions', () => {
    expect(getDictionary('id').legal.privacyMetadataDescription)
      .toBe('Kebijakan privasi StackCrate — bagaimana kami mengumpulkan, menggunakan, dan melindungi data Anda.');
    expect(getDictionary('en').legal.privacyMetadataDescription)
      .toBe('StackCrate privacy policy — how we collect, use, and protect your data.');
  });

  it('provides a dedicated footer description in every supported dictionary', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(getDictionary(locale).footer.description).toBeTruthy();
    }
  });

  it('keeps locale switcher buttons at navbar-safe touch target sizes', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    document.body.appendChild(container);

    await act(async () => {
      root.render(
        createElement(
          LocaleProvider,
          { initialLocale: 'id' },
          createElement(
            'div',
            null,
            createElement(LocaleSwitcher, { compact: true }),
            createElement(LocaleSwitcher),
          ),
        ),
      );
    });

    const switchers = container.querySelectorAll('[role="group"]');
    expect(switchers[0]?.querySelector('button')?.className).toContain('min-h-11');
    expect(switchers[0]?.querySelector('button')?.className).toContain('min-w-11');
    expect(switchers[1]?.querySelector('button')?.className).toContain('min-h-11');
    expect(switchers[1]?.querySelector('button')?.className).toContain('min-w-11');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('interpolates named values in translated messages', () => {
    expect(formatMessage('Showing {count} of {total} assets', { count: 3, total: 10 }))
      .toBe('Showing 3 of 10 assets');
  });

  it('formats visible counts with the active locale', () => {
    expect(formatCount(1234567, 'id')).toBe('1.234.567');
    expect(formatCount(1234567, 'en')).toBe('1,234,567');
  });

  it('provides favorite control and page copy in every supported dictionary', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const dictionary = getDictionary(locale);

      expect(dictionary.assets.favoriteAddTitle).toBeTruthy();
      expect(dictionary.assets.favoriteRemoveTitle).toBeTruthy();
      expect(dictionary.assets.favoriteUnauthorized).toBeTruthy();
      expect(dictionary.favorites.title).toBeTruthy();
      expect(dictionary.favorites.loading).toBeTruthy();
      expect(dictionary.favorites.emptyTitle).toBeTruthy();
      expect(dictionary.favorites.emptyHelper).toBeTruthy();
      expect(dictionary.favorites.exploreCta).toBeTruthy();
    }
  });

  it('provides accessible audio control labels in every supported dictionary', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const dictionary = getDictionary(locale);

      expect(dictionary.assets.playAudio).toBeTruthy();
      expect(dictionary.assets.pauseAudio).toBeTruthy();
      expect(dictionary.assets.volume).toBeTruthy();
    }
  });

  it('provides localized admin category form placeholders in every supported dictionary', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const dictionary = getDictionary(locale);

      expect(dictionary.admin.categoryNamePlaceholder).toBeTruthy();
      expect(dictionary.admin.categorySlugPlaceholder).toBeTruthy();
      expect(dictionary.admin.categoryIconPlaceholder).toBeTruthy();
    }
  });

  it('provides a localized admin access error distinct from sign-in errors', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const dictionary = getDictionary(locale);

      expect(dictionary.errors.forbidden).toBeTruthy();
      expect(dictionary.errors.forbidden).not.toBe(dictionary.errors.unauthorized);
    }
  });

  it('provides interpolated resource-specific admin control labels in every dictionary', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const dictionary = getDictionary(locale);
      const values = { name: 'Sample asset' };

      for (const label of [
        dictionary.admin.assetStatusLabel,
        dictionary.admin.assetCategoryLabel,
        dictionary.admin.viewAssetLabel,
        dictionary.admin.featureAssetLabel,
        dictionary.admin.unfeatureAssetLabel,
        dictionary.admin.deleteAssetLabel,
        dictionary.admin.editCategoryLabel,
        dictionary.admin.deleteCategoryLabel,
      ]) {
        expect(formatMessage(resolveMessage(label), values)).toContain(values.name);
      }
    }
  });
});
