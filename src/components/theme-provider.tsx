'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps } from 'react';

/**
 * ThemeProvider: wraps the app with dark/light theme support.
 * Default = dark mode (per PRD Section 6 warm & playful dark default).
 * Persists to localStorage. Respects prefers-color-scheme.
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}