import type { Metadata } from "next";
import "./globals.css";
import '@onelabs/dapp-kit/dist/index.css';
import { Providers } from "./providers";
import Navbar from "@/components/global/Navbar";
import ParticleBackground from "@/components/global/ParticleBackground";
import ErrorHandler from "@/components/global/ErrorHandler";

export const metadata: Metadata = {
  title: "Crypto Battle Arena",
  description: "Battle with cryptocurrencies in the Crypto Battle Arena",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-dark-bg text-foreground">
        <ErrorHandler />
        <ParticleBackground />
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
