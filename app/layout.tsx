import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

/* Stand-in for Altmann Grotesk, which is licensed and not available here.
   Inter is the nearest neutral grotesk. To swap, replace this with
   next/font/local pointing at the purchased files — the variable name is what
   globals.css consumes, so nothing else changes. */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OpenReply - Open source Instagram comment-to-DM automation",
  description:
    "A free, self-hosted ManyChat alternative. Send an Instagram DM automatically when someone comments a keyword on your post or reel, using the official Meta API.",
  keywords: [
    "instagram automation",
    "comment to DM",
    "instagram private replies",
    "social commerce",
    "manychat alternative",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full ${inter.variable}`}>
      <body className="min-h-full bg-background text-foreground font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
