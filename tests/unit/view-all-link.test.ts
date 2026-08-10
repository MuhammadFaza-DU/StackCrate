import { act, createElement, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { ViewAllLink } from '@/components/assets/ViewAllLink';
import { LocaleProvider } from '@/components/i18n/LocaleProvider';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function renderWithLocale(child: ReactNode, initialLocale: 'id' | 'en' = 'id') {
  const container = document.createElement('div');
  const root = createRoot(container);
  document.body.appendChild(container);

  act(() => {
    root.render(createElement(LocaleProvider, { initialLocale }, child));
  });

  return { container, root };
}

describe('ViewAllLink', () => {
  it('renders nothing when show is false', () => {
    const { container, root } = renderWithLocale(createElement(ViewAllLink, { show: false }));

    expect(container.querySelector('a[href="/explore"]')).toBeNull();

    act(() => root.unmount());
    container.remove();
  });

  it('renders a centered link to /explore with the Indonesian label when show is true', () => {
    const { container, root } = renderWithLocale(createElement(ViewAllLink, { show: true }));

    const link = container.querySelector('a[href="/explore"]');
    expect(link).not.toBeNull();
    expect(link?.textContent).toBe('Lihat Semua');
    expect(link?.parentElement?.className).toContain('justify-center');

    act(() => root.unmount());
    container.remove();
  });

  it('localizes the label with the active locale', () => {
    const { container, root } = renderWithLocale(createElement(ViewAllLink, { show: true }), 'en');

    const link = container.querySelector('a[href="/explore"]');
    expect(link?.textContent).toBe('View All');

    act(() => root.unmount());
    container.remove();
  });
});
