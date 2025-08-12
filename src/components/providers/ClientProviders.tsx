<<<<<<< HEAD
"use client"

import { SessionProvider } from "next-auth/react"
import WalletContextProvider from "./WalletProvider"
=======
'use client'

import { SessionProvider } from 'next-auth/react'
import WalletContextProvider from './WalletProvider'
>>>>>>> 086f6fceb3488d1131148f9ebcdfb1e742b995ce

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <WalletContextProvider>
        {children}
      </WalletContextProvider>
    </SessionProvider>
  )
}