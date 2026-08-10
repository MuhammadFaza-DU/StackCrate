import { act, createElement, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { CategoryNav } from '@/components/categories/CategoryNav';
import { LocaleProvider } from '@/components/i18n/LocaleProvider';
import type { Category } from '@/lib/types/asset';

vi.mock('next/navigation', () => ({
  usePathname: () => '/explore',
  useSearchParams: () => new URLSearchParams('category=music'),
  useRouter: () => ({ refresh: vi.fn() }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const categories: Category[] = [
  {
    id: 'music-id',
    slug: 'music',
    name: 'Music',
    description: null,
    icon: '🎵',
    sort_order: 0,
    created_at: '2026-08-10T00:00:00.000Z',
  },
];

function renderWithLocale(child: ReactNode) {
  const container = document.createElement('div');
  const root = createRoot(container);
  document.body.appendChild(container);

  act(() => {
    root.render(createElement(LocaleProvider, { initialLocale: 'id' }, child));
  });

  return { container, root };
}

describe('CategoryNav', () => {
  it('marks the selected Home category buttons as pressed', () => {
    const { container, root } = renderWithLocale(
      createElement(CategoryNav, {
        categories,
        selectable: true,
        activeSlug: 'music',
      }),
    );

    const buttons = Array.from(container.querySelectorAll('button'));
    expect(buttons.find((button) => button.textContent?.includes('Semua'))?.getAttribute('aria-pressed'))
      .toBe('false');
    expect(buttons.find((button) => button.textContent?.includes('Music'))?.getAttribute('aria-pressed'))
      .toBe('true');

    act(() => root.unmount());
    container.remove();
  });

  it('uses the Explore query category when selecting the active link', () => {
    const { container, root } = renderWithLocale(
      createElement(CategoryNav, { categories }),
    );

    const musicLink = container.querySelector('a[href="/explore?category=music"]');
    expect(musicLink?.className).toContain('bg-primary');

    act(() => root.unmount());
    container.remove();
  });
});
