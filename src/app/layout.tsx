import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";
import WalletContextProvider from "@/components/providers/WalletProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TaskFi - Decentralized Freelance Marketplace",
  description: "Connect with Web3 freelancers and hirers on Solana. Secure escrow payments, exclusive job assignments, and premium Web3 experience.",
  keywords: ['Web3', 'Freelance', 'Solana', 'Blockchain', 'Crypto', 'Escrow'],
  authors: [{ name: 'TaskFi Team' }],
  openGraph: {
    title: 'TaskFi - Decentralized Freelance Marketplace',
    description: 'Connect with Web3 freelancers and hirers on Solana. Secure escrow payments, exclusive job assignments, and premium Web3 experience.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased dark`}
      >
        <SessionProvider>
          <WalletContextProvider>
            {children}
          </WalletContextProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
