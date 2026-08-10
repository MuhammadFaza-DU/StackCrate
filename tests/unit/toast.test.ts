import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/components/i18n/LocaleProvider';
import { Toasts } from '@/components/ui/toast';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('toast accessibility', () => {
  it.each([
    ['id', 'Tutup notifikasi'],
    ['en', 'Dismiss notification'],
  ] as const)('uses the %s locale for the dismiss label', async (locale, expectedLabel) => {
    const container = document.createElement('div');
    const root = createRoot(container);
    document.body.appendChild(container);

    await act(async () => {
      root.render(
        createElement(
          LocaleProvider,
          { initialLocale: locale },
          createElement(Toasts, {
            toasts: [{ id: 1, type: 'info', message: 'Example' }],
            onDismiss: vi.fn(),
          }),
        ),
      );
    });

    expect(container.querySelector('button')?.getAttribute('aria-label')).toBe(expectedLabel);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('announces error toasts assertively while keeping other toasts polite', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    document.body.appendChild(container);

    await act(async () => {
      root.render(
        createElement(
          LocaleProvider,
          { initialLocale: 'en' },
          createElement(Toasts, {
            toasts: [
              { id: 1, type: 'error', message: 'Error' },
              { id: 2, type: 'info', message: 'Info' },
            ],
            onDismiss: vi.fn(),
          }),
        ),
      );
    });

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Error');
    expect(container.querySelectorAll('[role="status"]')).toHaveLength(1);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
