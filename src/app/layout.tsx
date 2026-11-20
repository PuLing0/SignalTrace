import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "SignalTrace — Tech signals before they become headlines",
  description:
    "An explainable early-signal radar for product launches, funding, and market-moving technology news.",
  keywords: [
    "technology intelligence",
    "startup signals",
    "product launches",
    "funding",
    "market intelligence",
  ],
  openGraph: {
    title: "SignalTrace",
    description: "See the signal before it becomes the headline.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
