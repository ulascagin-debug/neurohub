"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function InsightsRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/review-analyzer')
  }, [router])
  return null
}
