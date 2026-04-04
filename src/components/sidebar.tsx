"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useBusiness } from '@/lib/business-context'

const links = [
  { name: 'Overview', href: '/' },
  { name: 'Messages', href: '/messages' },
  { name: 'Reservations', href: '/reservations' },
  { name: 'Settings', href: '/settings' },
  { name: 'Growth Insights', href: '/insights' },
  { name: 'Review Analyzer', href: '/review-analyzer' },
  { name: 'Integrations', href: '/integrations' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { businesses, activeBusinessId, setActiveBusinessId } = useBusiness()

  return (
    <aside className="sidebar">
      <div style={{ padding: '0 24px', marginBottom: '32px' }}>
        <h2 className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>SaaS Board</h2>
        
        <div style={{ marginTop: '24px' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Active Business</p>
          <select 
            className="input-field" 
            value={activeBusinessId || ''} 
            onChange={(e) => setActiveBusinessId(e.target.value)}
            title="Select Business"
          >
            {businesses.length === 0 && <option value="">No businesses</option>}
            {businesses.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      <nav style={{ flex: 1 }}>
        {links.map(link => {
          const isActive = pathname === link.href
          return (
            <Link 
              key={link.name} 
              href={link.href}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              {link.name}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
