"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Defaults to light (the site's intended brand look) rather than following
 * the OS preference, since visitors shouldn't see an unrequested dark theme
 * on first visit — dark mode is opt-in via the header toggle.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
