"use client"

import { useBusiness } from '@/lib/business-context'
import { useEffect, useState, useCallback } from 'react'

const POLL_INTERVAL = 15000 // 15 seconds

interface ChatbotStatus {
  chatbot_enabled: boolean
  webhook_url: string | null
  has_integrations: boolean
  integration_count: number
  chatbot_alive: boolean
  chatbot_ping_ms: number | null
}

export default function OverviewPage() {
  const { activeBusinessId } = useBusiness()
  const [metrics, setMetrics] = useState<any>(null)
  const [botStatus, setBotStatus] = useState<ChatbotStatus | null>(null)
  const [toggling, setToggling] = useState(false)
  const [copied, setCopied] = useState(false)
  const [webhookInput, setWebhookInput] = useState('')
  const [editingWebhook, setEditingWebhook] = useState(false)
  const [savingWebhook, setSavingWebhook] = useState(false)
  const [startTime] = useState(Date.now())
  const [uptimeStr, setUptimeStr] = useState('')

  const fetchMetrics = useCallback(() => {
    if (!activeBusinessId) return
    fetch(`/api/dashboard/overview?business_id=${activeBusinessId}`)
      .then(res => res.json())
      .then(data => setMetrics(data))
  }, [activeBusinessId])

  const fetchBotStatus = useCallback(() => {
    if (!activeBusinessId) return
    fetch(`/api/dashboard/chatbot-control?business_id=${activeBusinessId}`)
      .then(res => res.json())
      .then(data => {
        setBotStatus(data)
        if (data.webhook_url && !editingWebhook) {
          setWebhookInput(data.webhook_url)
        }
      })
  }, [activeBusinessId, editingWebhook])

  // Uptime ticker
  useEffect(() => {
    if (!botStatus?.chatbot_alive) {
      setUptimeStr('')
      return
    }
    const tick = () => {
      const diff = Math.floor((Date.now() - startTime) / 1000)
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = diff % 60
      setUptimeStr(
        h > 0 ? `${h}s ${m}dk ${s}sn` : m > 0 ? `${m}dk ${s}sn` : `${s}sn`
      )
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [botStatus?.chatbot_alive, startTime])

  useEffect(() => {
    fetchMetrics()
    fetchBotStatus()
    const interval = setInterval(() => {
      fetchMetrics()
      fetchBotStatus()
    }, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchMetrics, fetchBotStatus])

  const handleToggle = async () => {
    if (!activeBusinessId || !botStatus || toggling) return
    setToggling(true)
    try {
      const res = await fetch('/api/dashboard/chatbot-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: activeBusinessId,
          chatbot_enabled: !botStatus.chatbot_enabled,
        }),
      })
      if (res.ok) {
        setBotStatus(prev => prev ? { ...prev, chatbot_enabled: !prev.chatbot_enabled } : prev)
      }
    } finally {
      setToggling(false)
    }
  }

  const handleSaveWebhook = async () => {
    if (!activeBusinessId || savingWebhook) return
    setSavingWebhook(true)
    try {
      const res = await fetch('/api/dashboard/chatbot-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: activeBusinessId,
          webhook_url: webhookInput,
        }),
      })
      if (res.ok) {
        setBotStatus(prev => prev ? { ...prev, webhook_url: webhookInput } : prev)
        setEditingWebhook(false)
      }
    } finally {
      setSavingWebhook(false)
    }
  }

  const handleCopy = () => {
    if (botStatus?.webhook_url) {
      navigator.clipboard.writeText(botStatus.webhook_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!activeBusinessId) {
    return <div>Please select a business from the sidebar to view metrics.</div>
  }

  if (!metrics) {
    return <div>Loading metrics...</div>
  }

  return (
    <div>
      <h1 className="text-gradient">Dashboard Overview</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Here's what is happening with your business today.
      </p>

      {/* ─── Chatbot Control Panel ─── */}
      {botStatus && (
        <div className="glass-panel" style={{ padding: '28px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1.5rem' }}>🤖</span>
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Chatbot Kontrol</h2>
            </div>
            {/* ON/OFF Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                fontSize: '0.8rem', fontWeight: 600,
                color: botStatus.chatbot_enabled ? 'var(--success)' : 'var(--text-secondary)',
              }}>
                {botStatus.chatbot_enabled ? 'AKTİF' : 'KAPALI'}
              </span>
              <div
                className={`toggle-switch ${botStatus.chatbot_enabled ? 'active' : ''} ${toggling ? 'disabled' : ''}`}
                onClick={handleToggle}
                role="switch"
                aria-checked={botStatus.chatbot_enabled}
                title={botStatus.chatbot_enabled ? 'Chatbot\'u kapat' : 'Chatbot\'u aç'}
              />
            </div>
          </div>

          {/* Status Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            {/* Live Status */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '16px 20px',
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px', fontWeight: 500, letterSpacing: '0.04em' }}>
                Sunucu Durumu
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className={`pulse-dot ${botStatus.chatbot_alive ? 'alive' : 'dead'}`} />
                <span style={{
                  fontWeight: 700,
                  color: botStatus.chatbot_alive ? 'var(--success)' : 'var(--danger)',
                }}>
                  {botStatus.chatbot_alive ? 'Çalışıyor' : 'Çevrimdışı'}
                </span>
              </div>
              {botStatus.chatbot_alive && botStatus.chatbot_ping_ms != null && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  Ping: {botStatus.chatbot_ping_ms}ms
                </div>
              )}
            </div>

            {/* Uptime */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '16px 20px',
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px', fontWeight: 500, letterSpacing: '0.04em' }}>
                Oturum Süresi
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.15rem' }}>
                {botStatus.chatbot_alive ? (uptimeStr || '—') : '—'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {botStatus.chatbot_alive ? 'Son kontrol bu oturumdan beri' : 'Sunucu yanıt vermiyor'}
              </div>
            </div>

            {/* Integrations count */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '16px 20px',
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px', fontWeight: 500, letterSpacing: '0.04em' }}>
                Bağlı Hesaplar
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.15rem' }}>
                {botStatus.integration_count}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {botStatus.has_integrations ? 'Instagram / WhatsApp' : 'Henüz bağlı hesap yok'}
              </div>
            </div>
          </div>

          {/* Webhook URL Section */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '16px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 500, letterSpacing: '0.04em' }}>
                Webhook URL (Meta'ya verilecek)
              </div>
              {!editingWebhook && (
                <button
                  onClick={() => setEditingWebhook(true)}
                  style={{
                    background: 'none', border: 'none', color: 'var(--accent-primary)',
                    cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                  }}
                >
                  ✏️ Düzenle
                </button>
              )}
            </div>

            {editingWebhook ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="https://xxxx.ngrok-free.app/webhook"
                  value={webhookInput}
                  onChange={e => setWebhookInput(e.target.value)}
                  style={{ flex: 1, fontSize: '0.825rem', fontFamily: 'monospace' }}
                />
                <button
                  className="btn-primary"
                  onClick={handleSaveWebhook}
                  disabled={savingWebhook}
                  style={{ padding: '10px 18px', fontSize: '0.8rem' }}
                >
                  {savingWebhook ? '...' : 'Kaydet'}
                </button>
                <button
                  onClick={() => {
                    setEditingWebhook(false)
                    setWebhookInput(botStatus.webhook_url || '')
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)', padding: '10px 14px', borderRadius: '8px',
                    cursor: 'pointer', fontSize: '0.8rem',
                  }}
                >
                  İptal
                </button>
              </div>
            ) : botStatus.webhook_url ? (
              <div className="webhook-url-box">
                <span style={{ flex: 1 }}>{botStatus.webhook_url}</span>
                <button className="copy-btn" onClick={handleCopy}>
                  {copied ? '✓ Kopyalandı' : '📋 Kopyala'}
                </button>
              </div>
            ) : (
              <div style={{
                padding: '12px 16px', borderRadius: '8px',
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                color: 'var(--warning)', fontSize: '0.85rem',
              }}>
                ⚠️ Webhook URL tanımlanmamış.{' '}
                <button
                  onClick={() => setEditingWebhook(true)}
                  style={{
                    background: 'none', border: 'none', color: 'var(--accent-primary)',
                    cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', fontSize: '0.85rem',
                  }}
                >
                  Şimdi ekleyin
                </button>
              </div>
            )}

            {botStatus.webhook_url && (
              <div style={{
                marginTop: '10px', fontSize: '0.72rem', color: 'var(--text-secondary)',
                background: 'rgba(99,102,241,0.06)', padding: '8px 12px', borderRadius: '6px',
                lineHeight: 1.5,
              }}>
                💡 Bu URL'yi Meta Developer Console → Webhooks bölümüne yapıştırın.
                Callback URL olarak <strong style={{ color: 'var(--accent-primary)' }}>{botStatus.webhook_url}</strong> kullanın.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Metrics Grid ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textTransform: 'uppercase' }}>Weekly Reservations</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{metrics.reservationsCount}</p>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textTransform: 'uppercase' }}>Total Messages</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{metrics.messagesCount}</p>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textTransform: 'uppercase' }}>Conversion Rate</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--success)' }}>
            {metrics.conversionRate}%
          </p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '32px' }}>
        <h2 style={{ marginBottom: '16px' }}>AI Trend Analizi 🚀</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Geçmiş rezervasyon ve mesaj hacimlerine dayanarak önümüzdeki hafta için tahminler.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <div style={{ padding: '24px', background: 'rgba(99,102,241,0.06)', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.15)' }}>
            <h3 style={{ fontSize: '0.9rem', color: '#a5b4fc', textTransform: 'uppercase', marginBottom: '8px' }}>Gelecek Hafta Beklentisi</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 800, margin: '8px 0', color: 'var(--text-primary)' }}>
              {metrics.predictedNextWeek} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>rezervasyon</span>
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              {metrics.predictedNextWeek > metrics.reservationsCount 
                ? "💡 Artan mesaj trafiği ve etkileşimler yukarı yönlü bir trend olduğuna işaret ediyor."
                : "💡 Geçen haftaya benzer stabil bir aktivite ortamı öngörülüyor."}
            </p>
          </div>

          <div style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
             <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '16px' }}>Sistem Önerileri</h3>
             <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
               <li style={{ display: 'flex', gap: '10px' }}><span style={{ color: 'var(--warning)' }}>⚠️</span> Hafta sonu akşam saatlerinde mesaj hacmi en tepe noktasına ulaşıyor. Chatbot performansının bu saatlerde artışı dönüşüme direk katkı sağlar.</li>
               <li style={{ display: 'flex', gap: '10px' }}><span style={{ color: 'var(--success)' }}>✓</span> Rezervasyon dönüşüm oranı stabil. Otomatik yanıtlarda iletişim tonu optimize edildi.</li>
               <li style={{ display: 'flex', gap: '10px' }}><span style={{ color: 'var(--info)' }}>↗️</span> Growth Insights sekmesindeki stratejileri aktif olarak uygulamanız önerilir.</li>
             </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
