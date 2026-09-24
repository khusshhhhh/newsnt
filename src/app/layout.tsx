import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "@/components/ui/sonner";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Nothing on first paint uses the mono face, so don't spend a preload on it
// for every page — it still loads on demand wherever `font-mono` appears.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

const satoshi = localFont({
  variable: "--font-heading",
  display: "swap",
  src: [
    { path: "../font/Satoshi-Regular.woff2", weight: "400", style: "normal" },
    { path: "../font/Satoshi-Medium.woff2", weight: "500", style: "normal" },
    { path: "../font/Satoshi-Bold.woff2", weight: "700", style: "normal" },
    { path: "../font/Satoshi-Black.woff2", weight: "900", style: "normal" },
  ],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Flow",
    template: "%s | Flow",
  },
  description:
    "Flow tapware and sanitaryware — basin mixers, kitchen mixers, taps and showers across six design series.",
  openGraph: {
    siteName: "Flow",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${satoshi.variable} h-full scroll-smooth antialiased`}
    >

      <body className="min-h-full flex flex-col">
        <NextTopLoader color="#171717" height={2} showSpinner={false} shadow={false} />
        <a
          href="#main-content"
          className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-foreground focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:font-semibold focus-visible:text-background"
        >
          Skip to content
        </a>
        {children}
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
