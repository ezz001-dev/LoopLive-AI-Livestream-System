import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LoopLive AI - Livestream Management",
  description: "Next-gen AI Livestreaming System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-50 min-h-screen font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
