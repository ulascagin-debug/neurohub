"use client"

import { Sidebar } from './sidebar'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [onboardingChecked, setOnboardingChecked] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Check onboarding status after authentication
  useEffect(() => {
    if (status !== 'authenticated') return

    fetch('/api/auth/onboarding-status')
      .then(res => res.json())
      .then(data => {
        if (data.onboarding_completed === false) {
          router.push('/setup')
        } else {
          setOnboardingChecked(true)
        }
      })
      .catch(() => {
        // If check fails, allow through (don't block existing users)
        setOnboardingChecked(true)
      })
  }, [status, router])

  if (status === 'loading' || (status === 'authenticated' && !onboardingChecked)) {
    return (
      <div style={{ 
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-main)', color: 'var(--text-secondary)' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: 40, height: 40, border: '3px solid var(--border-color)', 
            borderTopColor: 'var(--accent-primary)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
          }} />
          <p>Yükleniyor...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {session.user?.name || session.user?.email}
            </span>
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}
