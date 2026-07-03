import type { Metadata } from "next";
import { Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

const SITE = "https://pyreprotocol.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Pyre Protocol",
  description:
    "Stake to survive. Burn to transcend. Stake $PYRE to earn $ETH, burn it to forge your Acolyte. The gate opens soon.",
  openGraph: {
    title: "Pyre Protocol",
    description:
      "Stake to survive. Burn to transcend. Stake $PYRE to earn $ETH, burn it to forge your Acolyte. The gate opens soon.",
    url: SITE,
    siteName: "Pyre Protocol",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "The Acolyte of Pyre" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@pyre_protocol",
    title: "Pyre Protocol",
    description:
      "Stake to survive. Burn to transcend. Stake $PYRE to earn $ETH, burn it to forge your Acolyte. The gate opens soon.",
    images: ["/og.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cormorant.variable}>
      <body>{children}</body>
    </html>
  );
}
