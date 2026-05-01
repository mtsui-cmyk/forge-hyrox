import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FORGE — HYROX Race Engine",
  description: "AI-powered personalized HYROX training plans. Forge your race strategy.",
};

import { Providers } from "@/components/Providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head />
      <body className="antialiased font-sans flex flex-col min-h-screen">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
