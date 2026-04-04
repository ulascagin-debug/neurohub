"use client"

import { useBusiness } from '@/lib/business-context'
import { useEffect, useState } from 'react'

export default function SettingsPage() {
  const { activeBusinessId } = useBusiness()
  const [config, setConfig] = useState<any>({ tone: 'friendly', table_count: 0, menu_pdf_url: '', campaigns: '', address: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<'free' | 'pro'>('free')

  useEffect(() => {
    if (!activeBusinessId) return
    setLoading(true)
    fetch(`/api/dashboard/settings?business_id=${activeBusinessId}`)
      .then(res => res.json())
      .then(data => {
        if (data.config) setConfig(data.config)
        setLoading(false)
      })
  }, [activeBusinessId])

  // Fetch plan info
  useEffect(() => {
    fetch('/api/auth/onboarding-status')
      .then(res => res.json())
      .then(data => {
        if (data.plan === 'pro') setCurrentPlan('pro')
      })
      .catch(() => {})
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/dashboard/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id: activeBusinessId, ...config })
    })
    setSaving(false)
    alert('Settings saved successfully!')
  }

  if (!activeBusinessId) return <div>Please select a business.</div>
  if (loading) return <div>Loading settings...</div>

  return (
    <div style={{ maxWidth: '800px' }}>
      <h1 className="text-gradient">Settings</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Configure your chatbot and manage your subscription plan.
      </p>

      {/* ─── Chatbot Settings ─── */}
      <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          🤖 Chatbot Ayarları
        </h2>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>AI Tone</label>
            <select 
              className="input-field" 
              value={config.tone || 'friendly'} 
              onChange={e => setConfig({...config, tone: e.target.value})}
              title="Select tone"
            >
              <option value="friendly">Friendly</option>
              <option value="formal">Formal</option>
              <option value="casual">Casual</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Table Count</label>
            <input 
              type="number" 
              className="input-field" 
              value={config.table_count || 0} 
              onChange={e => setConfig({...config, table_count: parseInt(e.target.value)})} 
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Menu PDF URL</label>
            <input 
              type="url" 
              className="input-field" 
              placeholder="https://example.com/menu.pdf"
              value={config.menu_pdf_url || ''} 
              onChange={e => setConfig({...config, menu_pdf_url: e.target.value})} 
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Active Campaigns & Offers</label>
            <textarea 
              className="input-field" 
              style={{ minHeight: '100px', resize: 'vertical' }}
              placeholder="e.g. 20% off all pizzas this Friday!"
              value={config.campaigns || ''} 
              onChange={e => setConfig({...config, campaigns: e.target.value})} 
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Business Address</label>
            <input 
              type="text" 
              className="input-field" 
              value={config.address || ''} 
              onChange={e => setConfig({...config, address: e.target.value})} 
            />
          </div>

          <div style={{ marginTop: '16px' }}>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* ─── Plan Management ─── */}
      <div className="glass-panel" style={{ padding: '32px' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          💎 Plan Yönetimi
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
          Mevcut planınız ve kullanım limitleriniz.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Free Plan */}
          <div style={{
            position: 'relative',
            padding: '28px 24px',
            borderRadius: '14px',
            border: currentPlan === 'free'
              ? '2px solid #6366f1'
              : '1px solid rgba(255,255,255,0.08)',
            background: currentPlan === 'free'
              ? 'rgba(99,102,241,0.08)'
              : 'rgba(255,255,255,0.02)',
            transition: 'all 0.3s ease',
          }}>
            {currentPlan === 'free' && (
              <div style={{
                position: 'absolute', top: '-10px', right: '16px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', padding: '3px 12px', borderRadius: '20px',
                fontSize: '0.7rem', fontWeight: 700,
              }}>
                AKTİF
              </div>
            )}
            <div style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '4px' }}>Free</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '16px' }}>
              ₺0
              <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}> /ay</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--success)' }}>✓</span> 1 hesap bağlantısı
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--success)' }}>✓</span> Ayda 5 AI analiz
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--success)' }}>✓</span> Chatbot desteği
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--success)' }}>✓</span> Rezervasyon yönetimi
              </div>
            </div>
          </div>

          {/* Pro Plan */}
          <div style={{
            position: 'relative',
            padding: '28px 24px',
            borderRadius: '14px',
            border: currentPlan === 'pro'
              ? '2px solid #f59e0b'
              : '1px solid rgba(255,255,255,0.08)',
            background: currentPlan === 'pro'
              ? 'rgba(245,158,11,0.08)'
              : 'rgba(255,255,255,0.02)',
            transition: 'all 0.3s ease',
          }}>
            {currentPlan === 'pro' ? (
              <div style={{
                position: 'absolute', top: '-10px', right: '16px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#000', padding: '3px 12px', borderRadius: '20px',
                fontSize: '0.7rem', fontWeight: 700,
              }}>
                AKTİF
              </div>
            ) : (
              <div style={{
                position: 'absolute', top: '-10px', right: '16px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', padding: '3px 12px', borderRadius: '20px',
                fontSize: '0.7rem', fontWeight: 700,
              }}>
                ÖNERİLEN
              </div>
            )}
            <div style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '4px', color: '#f59e0b' }}>Pro</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '16px' }}>
              ₺299
              <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}> /ay</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                <span style={{ color: '#f59e0b' }}>✓</span> 3 hesap bağlantısı
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                <span style={{ color: '#f59e0b' }}>✓</span> Sınırsız AI analiz
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                <span style={{ color: '#f59e0b' }}>✓</span> Chatbot desteği
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                <span style={{ color: '#f59e0b' }}>✓</span> Öncelikli destek
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                <span style={{ color: '#f59e0b' }}>✓</span> Detaylı raporlama
              </div>
            </div>

            {currentPlan !== 'pro' && (
              <button
                disabled
                title="Ödeme sistemi yakında aktif olacak"
                style={{
                  marginTop: '20px', width: '100%', padding: '12px',
                  borderRadius: '10px', border: 'none',
                  background: 'rgba(245,158,11,0.15)',
                  color: '#f59e0b', fontSize: '0.85rem', fontWeight: 700,
                  cursor: 'not-allowed', opacity: 0.7,
                }}
              >
                🔒 Yakında — Upgrade to Pro
              </button>
            )}
          </div>
        </div>

        {/* Usage Info */}
        <div style={{
          marginTop: '20px', padding: '14px 18px',
          background: 'rgba(99,102,241,0.06)', borderRadius: '10px',
          border: '1px solid rgba(99,102,241,0.12)',
          fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6,
        }}>
          💡 Ödeme sistemi yakında aktif olacak. Şu anda tüm özellikler ücretsiz kullanıma açıktır.
        </div>
      </div>
    </div>
  )
}
