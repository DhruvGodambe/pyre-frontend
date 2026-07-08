import type { Metadata } from "next";
import { Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { Analytics } from "@vercel/analytics/next";

// Display font wired through the token --font-cormorant (see globals.css).
// Swap this for the designer's chosen display font when it arrives.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PYRE",
  description: "The fire consumes everything that doesn't commit.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cormorant.variable}>
      <body>
        <Providers>{children}</Providers>
        {/* Vercel Web Analytics: page views + custom events (cookieless).
            Collects only after Web Analytics is enabled on the Vercel project. */}
        <Analytics />
      </body>
    </html>
  );
}
