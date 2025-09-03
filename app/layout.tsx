import "./globals.css";
import Script from "next/script";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TalkTech",
  description: "Futuristic TalkTech hero on Cloudflare Pages",
  openGraph: {
    title: "TalkTech",
    description: "Hardware to software, VoIP to AI—TalkTech connects your business.",
    url: "https://talktech.example",
    siteName: "TalkTech",
    images: [
      { url: "/og-image.png", width: 1200, height: 630, alt: "TalkTech" },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TalkTech",
    description: "Hardware to software, VoIP to AI—TalkTech connects your business.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
  <link rel="icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" href="/icon-192.png" />
  <meta name="theme-color" content="#0b122f" />
  <Script id="cf-beacon" defer src="https://static.cloudflareinsights.com/beacon.min.js"
    data-cf-beacon={JSON.stringify({ token: process.env.NEXT_PUBLIC_CF_BEACON_TOKEN || "" })} />{children}</body>
    </html>
  );
}
