"use client"

import { Sidebar } from './sidebar'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  if (status === 'loading') {
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
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(239,68,68,0.25)',
                background: 'rgba(239,68,68,0.08)',
                color: '#f87171',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                transition: 'var(--transition-smooth)',
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.18)'
                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'
              }}
            >
              🚪 Çıkış Yap
            </button>
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}
