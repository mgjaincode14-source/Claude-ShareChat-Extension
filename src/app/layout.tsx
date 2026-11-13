import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://claudesharechat.vercel.app"
  ),
  title: {
    default: "Claude ShareChat — Privacy-First Conversation Sharing",
    template: "%s | Claude ShareChat",
  },
  description:
    "Selectively filter, redact, and share Claude AI conversations as beautiful, immutable public links — with on-device privacy controls and no data sent to third parties.",
  keywords: ["Claude", "AI", "conversation sharing", "privacy", "redaction", "Claude AI"],
  authors: [{ name: "Claude ShareChat" }],
  openGraph: {
    title: "Claude ShareChat — Privacy-First Conversation Sharing",
    description:
      "Filter, redact, and share Claude conversations as beautiful, privacy-safe public links.",
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Claude ShareChat",
    description: "Privacy-first Claude conversation sharing.",
    images: ["/api/og"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
