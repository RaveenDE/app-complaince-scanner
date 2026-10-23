import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DISCLAIMER } from "@/lib/disclaimer";
import "./globals.css";

export const metadata: Metadata = {
  title: "App Compliance Scanner",
  description: DISCLAIMER,
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
