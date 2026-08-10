'use client';

import Link from 'next/link';
import { useLocale } from '@/components/i18n/LocaleProvider';
import type { Message } from '@/i18n/types';

const text = (message: Message) => (typeof message === 'function' ? message() : message);

interface ViewAllLinkProps {
  show: boolean;
}

export function ViewAllLink({ show }: ViewAllLinkProps) {
  const { dictionary } = useLocale();

  if (!show) return null;

  return (
    <div className="flex justify-center pt-2">
      <Link
        href="/explore"
        className="inline-flex items-center justify-center rounded-full border border-border px-6 py-2.5 text-sm font-semibold text-foreground hover:bg-accent hover:text-accent-foreground active:translate-y-[1px] transition"
      >
        {text(dictionary.home.viewAll)}
      </Link>
    </div>
  );
}
