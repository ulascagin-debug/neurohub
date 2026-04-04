"use client"

import { useBusiness } from '@/lib/business-context'
import { useEffect, useState } from 'react'
import { WhatsAppIcon, InstagramIcon } from '@/components/PlatformIcons'

interface Integration {
  id: string
  platform: string
  platform_identifier: string
  access_token: string | null
}

interface Quota {
  count: number
  max: number
  remaining: number
}

export default function IntegrationsPage() {
  const { activeBusinessId, activeBusiness } = useBusiness()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [quota, setQuota] = useState<Quota>({ count: 0, max: 3, remaining: 3 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPlatform, setNewPlatform] = useState<'instagram' | 'whatsapp'>('instagram')
  const [newIdentifier, setNewIdentifier] = useState('')
  const [newToken, setNewToken] = useState('')

  const fetchIntegrations = async () => {
    if (!activeBusinessId) return
    setLoading(true)
    const res = await fetch(`/api/dashboard/integrations?business_id=${activeBusinessId}`)
    const data = await res.json()
    setIntegrations(data.integrations || [])
    setLoading(false)
  }

  const fetchQuota = async () => {
    const res = await fetch('/api/dashboard/integrations/count')
    const data = await res.json()
    setQuota(data)
  }

  useEffect(() => {
    fetchIntegrations()
    fetchQuota()
  }, [activeBusinessId])

  const handleAddIntegration = async () => {
    if (!newIdentifier) {
      setError('Platform ID gerekli!')
      return
    }
    setError('')
    setSuccess('')
    setSaving(true)

    const res = await fetch('/api/dashboard/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_id: activeBusinessId,
        platform: newPlatform,
        platform_identifier: newIdentifier,
        access_token: newToken || null,
      }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Bağlantı başarısız')
    } else {
      setSuccess(`${newPlatform === 'instagram' ? 'Instagram' : 'WhatsApp'} hesabı bağlandı ve chatbot otomatik olarak aktif edildi! 🤖`)
      setNewIdentifier('')
      setNewToken('')
      setShowAddForm(false)
      await fetchIntegrations()
      await fetchQuota()
    }
    setSaving(false)
  }

  const handleDisconnect = async (integration: Integration) => {
    const platformName = integration.platform === 'instagram' ? 'Instagram' : 'WhatsApp'
    if (!confirm(`${platformName} (${integration.platform_identifier}) bağlantısını kaldırmak istediğinize emin misiniz?`)) return
    
    setError('')
    setSuccess('')
    await fetch('/api/dashboard/integrations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: integration.id }),
    })
    setSuccess(`${platformName} hesabı kaldırıldı.`)
    await fetchIntegrations()
    await fetchQuota()
  }

  if (!activeBusinessId) {
    return (
      <div style={{ textAlign: 'center', paddingTop: '80px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔗</div>
        <h2>İşletme Seçin</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Entegrasyonları yönetmek için sol menüden bir işletme seçin.</p>
      </div>
    )
  }

  const limitReached = quota.remaining <= 0

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 className="text-gradient">Entegrasyonlar</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Instagram ve WhatsApp hesaplarınızı bağlayarak chatbot'u otomatik aktif edin.
          </p>
        </div>
        {/* Quota Badge */}
        <div style={{
          background: limitReached ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)',
          border: `1px solid ${limitReached ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.3)'}`,
          borderRadius: '12px',
          padding: '12px 20px',
          textAlign: 'center',
          minWidth: '120px',
        }}>
          <div style={{ 
            fontSize: '1.5rem', fontWeight: 800,
            color: limitReached ? 'var(--danger)' : 'var(--accent-primary)'
          }}>
            {quota.count}/{quota.max}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Hesap Kullanıldı
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '10px', padding: '14px 20px', marginBottom: '20px',
          color: '#f87171', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span>⚠️</span> {error}
        </div>
      )}
      {success && (
        <div style={{
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: '10px', padding: '14px 20px', marginBottom: '20px',
          color: '#34d399', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span>✅</span> {success}
        </div>
      )}

      {/* Connected Accounts List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        {loading ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Yükleniyor...
          </div>
        ) : integrations.length === 0 ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px', opacity: 0.5 }}>🔌</div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Henüz bağlı hesap yok</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Aşağıdan Instagram veya WhatsApp hesabı ekleyerek chatbot'u aktif edin.
            </p>
          </div>
        ) : (
          integrations.map((integration) => {
            const isIG = integration.platform === 'instagram'
            return (
              <div key={integration.id} className="glass-panel" style={{ 
                padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'all 0.2s ease',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {/* Platform Icon */}
                  <div style={{
                    width: 44, height: 44, borderRadius: '10px',
                    background: isIG 
                      ? 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)'
                      : '#25d366',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 'bold', fontSize: '16px',
                    boxShadow: isIG 
                      ? '0 4px 14px rgba(220,39,67,0.3)'
                      : '0 4px 14px rgba(37,211,102,0.3)',
                  }}>
                    {isIG ? <InstagramIcon size={20} /> : <WhatsAppIcon size={20} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '2px' }}>
                      {isIG ? 'Instagram' : 'WhatsApp Business'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      ID: {integration.platform_identifier}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Chatbot Active Badge */}
                  <span style={{
                    background: 'rgba(16,185,129,0.15)',
                    color: 'var(--success)',
                    padding: '5px 14px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    <span style={{ 
                      width: 7, height: 7, borderRadius: '50%', 
                      background: 'var(--success)',
                      boxShadow: '0 0 8px var(--success)',
                    }} />
                    Chatbot Aktif
                  </span>
                  {/* Disconnect */}
                  <button
                    onClick={() => handleDisconnect(integration)}
                    style={{
                      background: 'rgba(239,68,68,0.1)',
                      color: 'var(--danger)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      transition: 'all 0.2s',
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.background = 'rgba(239,68,68,0.2)'
                      e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
                      e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'
                    }}
                  >
                    Kaldır
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add New Integration */}
      {!showAddForm ? (
        <button
          onClick={() => { 
            if (limitReached) {
              setError(`Maksimum ${quota.max} hesap hakkınız var. Yeni eklemek için mevcut birini kaldırın.`)
              return
            }
            setShowAddForm(true)
            setError('')
            setSuccess('')
          }}
          disabled={limitReached}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '12px',
            border: `2px dashed ${limitReached ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.3)'}`,
            background: limitReached ? 'rgba(255,255,255,0.01)' : 'rgba(99,102,241,0.05)',
            color: limitReached ? 'var(--text-secondary)' : 'var(--accent-primary)',
            cursor: limitReached ? 'not-allowed' : 'pointer',
            fontSize: '0.95rem',
            fontWeight: 600,
            transition: 'all 0.2s',
            opacity: limitReached ? 0.5 : 1,
          }}
          onMouseOver={e => {
            if (!limitReached) {
              e.currentTarget.style.background = 'rgba(99,102,241,0.1)'
              e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'
            }
          }}
          onMouseOut={e => {
            if (!limitReached) {
              e.currentTarget.style.background = 'rgba(99,102,241,0.05)'
              e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'
            }
          }}
        >
          {limitReached ? `Limit Doldu (${quota.count}/${quota.max})` : '+ Yeni Hesap Ekle'}
        </button>
      ) : (
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>Yeni Hesap Bağla</h3>
            <button
              onClick={() => { setShowAddForm(false); setError('') }}
              style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)', width: 32, height: 32, borderRadius: '8px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem',
              }}
            >
              ✕
            </button>
          </div>

          {/* Platform Toggle */}
          <div style={{
            display: 'flex', gap: '4px', marginBottom: '20px',
            background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '4px',
          }}>
            <button
              onClick={() => setNewPlatform('instagram')}
              style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
                transition: 'all 0.2s',
                background: newPlatform === 'instagram'
                  ? 'linear-gradient(45deg, rgba(240,148,51,0.3), rgba(188,24,136,0.3))'
                  : 'transparent',
                color: newPlatform === 'instagram' ? '#f09433' : 'rgba(255,255,255,0.4)',
              }}
            >
              📸 Instagram
            </button>
            <button
              onClick={() => setNewPlatform('whatsapp')}
              style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
                transition: 'all 0.2s',
                background: newPlatform === 'whatsapp'
                  ? 'rgba(37,211,102,0.2)'
                  : 'transparent',
                color: newPlatform === 'whatsapp' ? '#25d366' : 'rgba(255,255,255,0.4)',
              }}
            >
              💬 WhatsApp
            </button>
          </div>

          {/* Form Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>
                {newPlatform === 'instagram' ? 'Instagram Page ID' : 'WhatsApp Phone Number ID'}
              </label>
              <input
                type="text"
                className="input-field"
                placeholder={newPlatform === 'instagram' ? 'örn. 26127995610189827' : 'Meta WhatsApp Business Phone ID'}
                value={newIdentifier}
                onChange={e => setNewIdentifier(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>
                Access Token
              </label>
              <input
                type="password"
                className="input-field"
                placeholder={newPlatform === 'instagram' ? 'Instagram Graph API Access Token' : 'WhatsApp Cloud API Token'}
                value={newToken}
                onChange={e => setNewToken(e.target.value)}
              />
            </div>

            {/* Info Box */}
            <div style={{
              background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)',
              borderRadius: '8px', padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)',
              lineHeight: 1.5,
            }}>
              💡 Hesap bağlandığında chatbot <strong style={{ color: 'var(--success)' }}>otomatik olarak aktif</strong> edilir. 
              İşletme ayarlarından menü, adres ve çalışma saatlerini düzenleyebilirsiniz.
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
              <button
                className="btn-primary"
                onClick={handleAddIntegration}
                disabled={saving}
                style={{ flex: 1, padding: '14px', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Bağlanıyor...' : '🔗 Bağla ve Chatbot\'u Aktif Et'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* How it works section */}
      <div className="glass-panel" style={{ padding: '24px', marginTop: '32px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '1rem' }}>🤖 Nasıl Çalışır?</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {[
            { step: '1', title: 'Hesap Bağla', desc: 'Instagram veya WhatsApp hesabınızın ID ve token bilgilerini girin.' },
            { step: '2', title: 'Otomatik Aktivasyon', desc: 'Chatbot anında aktif olur ve gelen mesajlara yanıt vermeye başlar.' },
            { step: '3', title: 'Özelleştir', desc: 'Ayarlardan menü, adres ve çalışma saatlerini düzenleyin.' },
          ].map(item => (
            <div key={item.step} style={{ textAlign: 'center' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-primary), #6366f1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 10px', fontWeight: 800, fontSize: '0.9rem',
              }}>
                {item.step}
              </div>
              <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '0.85rem' }}>{item.title}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
