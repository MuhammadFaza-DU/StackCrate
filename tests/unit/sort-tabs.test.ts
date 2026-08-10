import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/components/i18n/LocaleProvider';
import { SortTabs } from '@/components/assets/SortTabs';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('SortTabs accessibility', () => {
  it('uses an accessible pressed button group for sorting', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    document.body.appendChild(container);

    await act(async () => {
      root.render(
        createElement(
          LocaleProvider,
          { initialLocale: 'en' },
          createElement(SortTabs, { value: 'newest', onChange: () => {} }),
        ),
      );
    });

    expect(container.querySelector('[role="group"]')).not.toBeNull();
    expect(container.querySelector('[role="tablist"]')).toBeNull();
    expect(container.querySelector('button[aria-pressed="true"]')).not.toBeNull();
    expect(container.querySelector('button[role="tab"]')).toBeNull();

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
