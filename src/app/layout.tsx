import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prima Volta",
  description: "Piano fluency & sight-reading trainer",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0e1218] text-[#e8eaee] antialiased">{children}</body>
    </html>
  );
}
