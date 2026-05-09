import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Purple Mango AI Mint",
  description: "Design it. Mint it. Solana Blink NFT minting on Devnet."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
