<<<<<<< HEAD
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import ClientProviders from "@/components/providers/ClientProviders"
=======
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/providers/ClientProviders";
>>>>>>> 086f6fceb3488d1131148f9ebcdfb1e742b995ce

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

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
<<<<<<< HEAD
}
=======
};
>>>>>>> 086f6fceb3488d1131148f9ebcdfb1e742b995ce

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased dark`}
      >
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  )
}