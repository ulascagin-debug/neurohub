"use client"

import { SessionProvider } from "next-auth/react"
import { BusinessProvider } from "@/lib/business-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <BusinessProvider>
        {children}
      </BusinessProvider>
    </SessionProvider>
  )
}
