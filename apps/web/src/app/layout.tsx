import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import Script from "next/script";
import { DISCLAIMER } from "@/lib/disclaimer";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "App Compliance Scanner",
  description: DISCLAIMER,
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-50">
        <Script id="acs-theme" strategy="beforeInteractive">
          {`try{var t=localStorage.getItem("acs-theme");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}`}
        </Script>
        <a
          href="#main"
          className="no-print sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:m-0 focus:h-auto focus:w-auto focus:rounded-md focus:bg-zinc-900 focus:px-3 focus:py-2 focus:text-white"
        >
          Skip to main content
        </a>
        <header className="no-print border-b border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
            <Link className="font-semibold" href="/">
              App Compliance Scanner
            </Link>
            <nav className="flex items-center gap-3 text-sm">
              <Link className="underline" href="/scan/new">
                New scan
              </Link>
              <ThemeToggle />
            </nav>
          </div>
        </header>
        <div id="main">{children}</div>
        <footer className="no-print border-t border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-4 px-6 py-4 text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              Draft legal pages — to be lawyer-reviewed.
            </p>
            <nav className="flex items-center gap-3" aria-label="Legal">
              <Link className="underline" href="/privacy">
                Privacy policy
              </Link>
              <Link className="underline" href="/terms">
                Terms of use
              </Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
