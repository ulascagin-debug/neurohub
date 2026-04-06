"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useBusiness } from '@/lib/business-context'
import { signOut } from 'next-auth/react'

const navLinks = [
  { name: 'Overview', href: '/', icon: '📊' },
  { name: 'Review Analyzer', href: '/review-analyzer', icon: '🔍' },
  { name: 'Messages', href: '/messages', icon: '💬' },
  { name: 'Reservations', href: '/reservations', icon: '📋' },
  { name: 'Integrations', href: '/integrations', icon: '🔗' },
  { name: 'Settings', href: '/settings', icon: '⚙️' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { businesses, activeBusinessId, setActiveBusinessId, activeBusiness } = useBusiness()

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <h2 className="text-gradient" style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          NeuroHub
        </h2>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          Dashboard Center
        </p>
      </div>

      {/* Business Selector */}
      <div style={{ padding: '0 20px', marginBottom: '8px' }}>
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 14px',
        }}>
          <p style={{
            fontSize: '0.65rem', color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            marginBottom: '6px', fontWeight: 600,
          }}>
            Aktif İşletme
          </p>
          {businesses.length > 0 ? (
            <select
              className="input-field"
              value={activeBusinessId || ''}
              onChange={(e) => setActiveBusinessId(e.target.value)}
              title="Select Business"
              style={{
                padding: '8px 10px',
                fontSize: '0.8rem',
                fontWeight: 600,
                background: 'rgba(255,255,255,0.05)',
              }}
            >
              {businesses.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          ) : (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              İşletme yok
            </p>
          )}
          {activeBusiness?.business_type && (
            <p style={{
              fontSize: '0.7rem', color: 'var(--accent-primary)',
              marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              <span>🏷</span> {activeBusiness.business_type}
            </p>
          )}
        </div>
      </div>

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
          onClick={() => signOut({ callbackUrl: '/login' })}
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
