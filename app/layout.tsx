import type { Metadata } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { usingSampleData } from "@/lib/data";
import "./globals.css";

const sans = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  title: "ASO Gallery",
  description: "Inspiration for App Store screenshots, product page headers and search banners.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <header className="sticky top-0 z-20 border-b border-line bg-ink/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1440px] items-center gap-8 overflow-x-auto px-5 py-3 md:px-12">
            <Link href="/" className="shrink-0 text-lg font-bold tracking-[-0.03em]">ASO<span className="text-accent">gallery</span></Link>
            <Nav />
            <Link href="/submit" className="ml-auto shrink-0 rounded-full bg-fg px-4 py-2 text-sm font-semibold text-ink hover:bg-accent">Add an app</Link>
          </div>
        </header>
        {usingSampleData && (
          <p className="mx-auto max-w-[1440px] px-5 pt-4 text-xs text-muted md:px-12">Showing sample data. Run <code className="font-mono">npm run ingest</code> to capture real App Store listings.</p>
        )}
        <main className="mx-auto max-w-[1440px] px-5 md:px-12">{children}</main>
        <footer className="mx-auto max-w-[1440px] px-5 pb-16 pt-28 md:px-12">
          <div className="flex flex-wrap items-center justify-between gap-6 border-t border-line pt-10">
            <p className="max-w-lg text-2xl font-semibold tracking-[-0.03em] md:text-[28px]">The week&apos;s biggest creative changes, every Monday.</p>
            <form className="flex flex-wrap gap-2">
              <label htmlFor="digest-email" className="sr-only">Email</label>
              <input id="digest-email" type="email" placeholder="you@studio.com" className="h-12 w-72 max-w-[70vw] rounded-full border border-edge bg-panel px-5 outline-none focus:border-accent" />
              <button type="button" className="h-12 rounded-full bg-accent px-6 font-semibold text-ink">Subscribe</button>
            </form>
          </div>
        </footer>
      </body>
    </html>
  );
}
