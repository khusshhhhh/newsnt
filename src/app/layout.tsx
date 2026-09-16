import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const satoshi = localFont({
  variable: "--font-heading",
  display: "swap",
  src: [
    { path: "../font/Satoshi-Regular.otf", weight: "400", style: "normal" },
    { path: "../font/Satoshi-Medium.otf", weight: "500", style: "normal" },
    { path: "../font/Satoshi-Bold.otf", weight: "700", style: "normal" },
    { path: "../font/Satoshi-Black.otf", weight: "900", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: {
    default: "Aakar",
    template: "%s | Aakar",
  },
  description:
    "Aakar tapware and sanitaryware — basin mixers, kitchen mixers, taps and showers across six design series.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${satoshi.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
