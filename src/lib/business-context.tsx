"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Use a subset or matching interface for Business to avoid complete Prisma type leaks to client, but Prisma types work fine too usually.
interface BusinessContextType {
  activeBusinessId: string | null
  activeBusiness: any | null // we can refine this
  businesses: any[]
  setActiveBusinessId: (id: string) => void
  refreshBusinesses: () => Promise<void>
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined)

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [activeBusinessId, setActiveBusinessIdState] = useState<string | null>(null)
  const [businesses, setBusinesses] = useState<any[]>([])

  const fetchBusinesses = async () => {
    try {
        const response = await fetch('/api/businesses')
        const data = await response.json()
        if (data.businesses) {
          setBusinesses(data.businesses)
          if (!activeBusinessId && data.businesses.length > 0) {
             setActiveBusinessIdState(data.businesses[0].id)
          }
        }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchBusinesses()
  }, [])

  const setActiveBusinessId = (id: string) => {
    setActiveBusinessIdState(id)
    // Could optionally persist to localStorage here
  }

  const activeBusiness = businesses.find(b => b.id === activeBusinessId) || null

  return (
    <BusinessContext.Provider value={{ activeBusinessId, activeBusiness, businesses, setActiveBusinessId, refreshBusinesses: fetchBusinesses }}>
      {children}
    </BusinessContext.Provider>
  )
}

export function useBusiness() {
  const context = useContext(BusinessContext)
  if (!context) {
    throw new Error('useBusiness must be used within a BusinessProvider')
  }
  return context
}
