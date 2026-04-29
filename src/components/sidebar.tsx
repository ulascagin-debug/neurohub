"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useBusiness } from '@/lib/business-context'
import { signOut } from 'next-auth/react'
import { BusinessSelectorModal } from './business-selector-modal'

const navLinks = [
  { name: 'Overview', href: '/dashboard', icon: '📊' },
  { name: 'Review Analyzer', href: '/review-analyzer', icon: '🔍' },
  { name: 'Messages', href: '/messages', icon: '💬' },
  { name: 'Reservations', href: '/reservations', icon: '📋' },
  { name: 'Integrations', href: '/integrations', icon: '🔗' },
  { name: 'Settings', href: '/settings', icon: '⚙️' },
  { name: 'Abonelik', href: '/subscription', icon: '💎' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { businesses, activeBusinessId, setActiveBusinessId, activeBusiness } = useBusiness()
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <h2 className="text-gradient" style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activeBusiness?.name || 'NeuroHub'}
        </h2>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          {activeBusiness?.business_type || 'Dashboard Center'}
        </p>
      </div>

      {/* Business Selector */}
      <div style={{ padding: '0 20px', marginBottom: '8px' }}>
        <div 
          onClick={() => setIsModalOpen(true)}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            cursor: 'pointer',
            transition: 'var(--transition-smooth)'
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
          title="İşletme Seç / Değiştir"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <p style={{
              fontSize: '0.65rem', color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              fontWeight: 600, margin: 0
            }}>
              Aktif İşletme
            </p>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)' }}>&#9020;</span> 
          </div>
          
          {activeBusiness ? (
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, margin: '4px 0', color: 'var(--text-primary)' }}>
                {activeBusiness.name}
              </p>
              {activeBusiness.business_type && (
                <p style={{
                  fontSize: '0.7rem', color: 'var(--accent-primary)',
                  display: 'flex', alignItems: 'center', gap: '4px', margin: 0
                }}>
                  <span>🏷</span> {activeBusiness.business_type.split(',')[0]}
                </p>
              )}
            </div>
          ) : (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '4px 0' }}>
              İşletme yok. Değiştir
            </p>
          )}
        </div>
      </div>
      
      <BusinessSelectorModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

      <div className="sidebar-divider" />

      {/* Navigation */}
      <nav style={{ flex: 1 }}>
        <div className="nav-section-title">Menü</div>
        {navLinks.map(link => {
          const isActive = pathname === link.href
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{link.icon}</span>
              {link.name}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: Logout */}
      <div style={{ padding: '0 20px' }}>
        <div className="sidebar-divider" style={{ margin: '8px 0 12px' }} />
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            background: 'rgba(239,68,68,0.04)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 500,
            transition: 'var(--transition-smooth)',
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
            e.currentTarget.style.color = '#f87171'
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.04)'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
        >
          <span>🚪</span> Çıkış Yap
        </button>
      </div>
    </aside>
  )
}
