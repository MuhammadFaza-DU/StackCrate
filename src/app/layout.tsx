import type { Metadata } from 'next';
import { Knewave, Mystery_Quest, Kranky, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { MotionProvider } from '@/components/motion-provider';
import { UserProvider } from '@/components/providers/UserProvider';
import { LocaleProvider } from '@/components/i18n/LocaleProvider';
import dynamic from 'next/dynamic';
import { Footer } from '@/components/layout/Footer';
import { cookies } from 'next/headers';
import { getDictionary, LOCALE_COOKIE } from '@/i18n/config';
import { getLocaleFromCookieValue } from '@/i18n/server';
import { SITE_URL } from '@/lib/site-url';
import './globals.css';

const Header = dynamic(() => import('@/components/layout/Header').then((mod) => mod.Header));

const display = Knewave({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-knewave',
  display: 'swap',
});

const heading = Mystery_Quest({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-mystery-quest',
  display: 'swap',
});

const body = Kranky({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-kranky',
  display: 'swap',
});

const mono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = getLocaleFromCookieValue(cookieStore.get(LOCALE_COOKIE)?.value);
  const isEnglish = locale === 'en';
  const title = isEnglish
    ? 'StackCrate — Video Asset Aggregator'
    : 'StackCrate — Agregator Asset Video';
  const description = isEnglish
    ? 'Browse, preview, and download free video-editing assets. Audio and video clips for editors and creators.'
    : 'Jelajahi, preview, dan unduh asset editing video gratis. Klip audio dan video untuk editor dan kreator.';

  return {
    title,
    description,
    metadataBase: new URL(SITE_URL),
    openGraph: { title, description, type: 'website' },
    manifest: '/api/manifest',
  };
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const cookieStore = await cookies();
  const locale = getLocaleFromCookieValue(cookieStore.get(LOCALE_COOKIE)?.value);
  const dictionary = getDictionary(locale);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${display.variable} ${heading.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <head>
        <link rel="manifest" href="/api/manifest" />
        <meta name="theme-color" content="#f97316" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          enableColorScheme
        >
          <MotionProvider>
            <LocaleProvider initialLocale={locale}>
              <UserProvider>
                <Header />
                <div className="flex-1">{children}</div>
                <Footer dictionary={dictionary} />
              </UserProvider>
            </LocaleProvider>
          </MotionProvider>
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
