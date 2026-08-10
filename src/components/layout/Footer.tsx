import Link from 'next/link';
import type { Dictionary, Message } from '@/i18n/types';

const text = (message: Message) => typeof message === 'function' ? message() : message;

export function Footer({ dictionary }: { dictionary: Dictionary }) {
  return (
    <footer className="border-t border-border/40 mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-[#f97316] to-[#dc2626] flex items-center justify-center">
              <span className="text-white font-bold text-xs">SC</span>
            </div>
            <span className="font-heading text-sm text-muted-foreground">
              StackCrate
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {text(dictionary.footer.description)}
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground">
              {text(dictionary.common.terms)}
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              {text(dictionary.common.privacy)}
            </Link>
            <a
              href="https://muhammadfaza.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              {text(dictionary.footer.developerLink)}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
