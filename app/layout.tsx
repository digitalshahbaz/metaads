import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "MetaAds Research",
  description: "Search the Meta Ad Library, spot long-running winners, and build a swipe file.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <Link href="/" className="brand">
            MetaAds Research
          </Link>
          <div className="nav-links">
            <Link href="/">Research</Link>
            <Link href="/saved">Swipe file</Link>
          </div>
        </nav>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
