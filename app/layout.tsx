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
    <html lang="en" className={`h-full ${inter.variable}`} suppressHydrationWarning>
      <head>
        {/* Applies the saved theme before first paint. Anything later — an
            effect, a server round trip — paints the default theme first and
            then visibly swaps, which is worse than a blocking inline script
            this small. Key must match THEME_STORAGE_KEY in theme-picker. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('oddnawn:theme');if(t&&t!=='blue')document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full bg-background text-foreground font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
