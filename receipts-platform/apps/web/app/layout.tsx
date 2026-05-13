import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Receipts — Save Trees, Use eReceipts",
  description: "Universal receipt infrastructure — Plaid for Receipts. All your receipts in one place.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#050507] text-zinc-100 antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
