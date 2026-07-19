import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { councilConfig } from "@/config/council";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: councilConfig.applicationName,
  description:
    "Five independent perspectives challenge a decision before the Chairman consolidates the recommendation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full bg-neutral-100 text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
