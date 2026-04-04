"use client"

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface MapsBusiness {
  name: string
  url: string
  rating?: number
  reviews_count?: number
  address?: string
}

export default function SetupPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1: Location
  const [country, setCountry] = useState('Turkey')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')

  // Step 2: Business info
  const [businessName, setBusinessName] = useState('')
  const [category, setCategory] = useState('')

  // Step 3: Google Maps search
  const [searchResults, setSearchResults] = useState<MapsBusiness[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState<MapsBusiness | null>(null)

  // Step 4: Manual entry
  const [manualAddress, setManualAddress] = useState('')
  const [manualPhone, setManualPhone] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  // Step 1 → 2
  const handleStep1 = () => {
    if (!city.trim()) { setError('Şehir gerekli'); return }
    setError('')
    setStep(2)
  }

  // Step 2 → 3 (trigger Google Maps search)
  const handleStep2 = async () => {
    if (!businessName.trim()) { setError('İşletme adı gerekli'); return }
    setError('')
    setSearching(true)
    setStep(3)

    try {
      const resp = await fetch('/api/analyzer/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: category || businessName,
          city,
          district,
          country,
        }),
      })
      const data = await resp.json()
      if (data.businesses) {
        setSearchResults(data.businesses)
      } else {
        setSearchResults([])
      }
    } catch {
      setSearchResults([])
    }
    setSearching(false)
  }

  // Select a business from search results
  const handleSelectBusiness = async (biz: MapsBusiness) => {
    setSelectedBusiness(biz)
    await saveBusiness(biz.name, `${city}${district ? ', ' + district : ''}, ${country}`, biz.url)
  }

  // Step 4: Manual entry save
  const handleManualSave = async () => {
    if (!manualAddress.trim() && !city.trim()) { setError('En az bir konum bilgisi gerekli'); return }
    setError('')
    const location = manualAddress || `${city}${district ? ', ' + district : ''}, ${country}`
    await saveBusiness(businessName, location, null)
  }

  // Save business to DB and complete onboarding
  const saveBusiness = async (name: string, location: string, mapsUrl: string | null) => {
    setLoading(true)
    setError('')

    try {
      // Create business
      const bizResp = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, location }),
      })
      const bizData = await bizResp.json()

      if (!bizResp.ok) {
        setError(bizData.error || 'İşletme oluşturulamadı')
        setLoading(false)
        return
      }

      // Mark onboarding complete
      await fetch('/api/auth/onboarding-status', { method: 'POST' })

      // Redirect to dashboard
      router.push('/')
    } catch {
      setError('Bağlantı hatası')
    }
    setLoading(false)
  }

  if (status === 'loading') return null

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 50%, #0a0a1a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: step === 3 ? '720px' : '520px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        padding: '48px 40px',
        backdropFilter: 'blur(20px)',
        transition: 'max-width 0.3s ease',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h1 style={{
            fontSize: '1.75rem', fontWeight: 800,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: '8px',
          }}>
            🚀 İşletme Kurulumu
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>
            {step === 1 && 'Konumunuzu seçin'}
            {step === 2 && 'İşletmenizi tanımlayın'}
            {step === 3 && 'Google Maps\'te işletmenizi bulun'}
            {step === 4 && 'Bilgilerinizi manuel girin'}
          </p>
        </div>

        {/* Progress Steps */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '6px', marginBottom: '36px',
        }}>
          {[1, 2, 3, 4].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 700,
                background: step >= s
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : 'rgba(255,255,255,0.05)',
                color: step >= s ? '#fff' : 'rgba(255,255,255,0.3)',
                border: step >= s ? 'none' : '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.3s ease',
              }}>
                {step > s ? '✓' : s}
              </div>
              {s < 4 && (
                <div style={{
                  width: 28, height: 2,
                  background: step > s ? '#6366f1' : 'rgba(255,255,255,0.1)',
                  transition: 'all 0.3s ease',
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '10px', padding: '12px 16px', marginBottom: '20px',
            color: '#f87171', fontSize: '0.85rem', textAlign: 'center',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* ─── Step 1: Country / City ─── */}
        {step === 1 && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Ülke</label>
              <select
                value={country}
                onChange={e => setCountry(e.target.value)}
                style={inputStyle}
              >
                <option value="Turkey">🇹🇷 Türkiye</option>
                <option value="Germany">🇩🇪 Almanya</option>
                <option value="United Kingdom">🇬🇧 İngiltere</option>
                <option value="United States">🇺🇸 ABD</option>
                <option value="France">🇫🇷 Fransa</option>
                <option value="Netherlands">🇳🇱 Hollanda</option>
                <option value="Italy">🇮🇹 İtalya</option>
                <option value="Spain">🇪🇸 İspanya</option>
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Şehir *</label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="ör. İstanbul"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>İlçe (opsiyonel)</label>
              <input
                type="text"
                value={district}
                onChange={e => setDistrict(e.target.value)}
                placeholder="ör. Kadıköy"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
            <button onClick={handleStep1} style={btnPrimary}>
              Devam Et →
            </button>
          </div>
        )}

        {/* ─── Step 2: Business Name ─── */}
        {step === 2 && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>İşletme Adı *</label>
              <input
                type="text"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                placeholder="ör. Fookah Lounge"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Kategori / Sektör (opsiyonel)</label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="ör. Kafe, Berber, Restoran..."
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            <div style={{
              background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)',
              borderRadius: '10px', padding: '14px 18px', marginBottom: '24px',
              fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6,
            }}>
              🔍 Bir sonraki adımda işletmenizi Google Maps'te arayacağız.
              Eğer bulamazsak bilgileri kendiniz girebilirsiniz.
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setStep(1); setError('') }} style={btnSecondary}>
                ← Geri
              </button>
              <button onClick={handleStep2} disabled={loading} style={{ ...btnPrimary, flex: 1 }}>
                🔍 Google Maps'te Ara
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 3: Google Maps Search Results ─── */}
        {step === 3 && (
          <div>
            {searching ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{
                  width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)',
                  borderTopColor: '#6366f1', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
                }} />
                <p style={{ color: 'rgba(255,255,255,0.5)' }}>Google Maps'te aranıyor...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: '16px' }}>
                  {searchResults.length} işletme bulundu. Kendinizi seçin:
                </p>
                <div style={{
                  maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px',
                  marginBottom: '20px', paddingRight: '4px',
                }}>
                  {searchResults.slice(0, 20).map((biz, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectBusiness(biz)}
                      disabled={loading}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 18px', borderRadius: '10px',
                        border: selectedBusiness?.url === biz.url
                          ? '1px solid #6366f1'
                          : '1px solid rgba(255,255,255,0.08)',
                        background: selectedBusiness?.url === biz.url
                          ? 'rgba(99,102,241,0.12)'
                          : 'rgba(255,255,255,0.02)',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        textAlign: 'left',
                        width: '100%',
                        color: '#fff',
                      }}
                      onMouseOver={e => {
                        if (!loading) e.currentTarget.style.background = 'rgba(99,102,241,0.08)'
                      }}
                      onMouseOut={e => {
                        if (selectedBusiness?.url !== biz.url)
                          e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '3px' }}>
                          {biz.name}
                        </div>
                        {biz.address && (
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            📍 {biz.address}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                        {biz.rating && (
                          <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700 }}>
                            ⭐ {biz.rating}
                          </div>
                        )}
                        {biz.reviews_count != null && (
                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>
                            {biz.reviews_count} yorum
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 0', marginBottom: '20px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px', opacity: 0.4 }}>🔍</div>
                <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                  Google Maps'te eşleşen işletme bulunamadı.
                </p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem' }}>
                  Bilgilerinizi aşağıdan manuel olarak girebilirsiniz.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setStep(2); setError(''); setSearchResults([]) }} style={btnSecondary}>
                ← Geri
              </button>
              <button
                onClick={() => setStep(4)}
                style={{
                  ...btnSecondary, flex: 1,
                  background: 'rgba(245,158,11,0.1)',
                  border: '1px solid rgba(245,158,11,0.25)',
                  color: '#f59e0b',
                }}
              >
                ✏️ Bulunamadı, Manuel Gir
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 4: Manual Entry ─── */}
        {step === 4 && (
          <div>
            <div style={{
              background: 'rgba(99,102,241,0.06)', borderRadius: '10px',
              padding: '14px 18px', marginBottom: '20px',
              fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6,
            }}>
              📝 <strong style={{ color: '#a5b4fc' }}>{businessName}</strong> için konum ve iletişim bilgilerini girin.
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Adres / Konum</label>
              <input
                type="text"
                value={manualAddress}
                onChange={e => setManualAddress(e.target.value)}
                placeholder={`ör. ${district || 'Kadıköy'}, ${city || 'İstanbul'}`}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Telefon (opsiyonel)</label>
              <input
                type="text"
                value={manualPhone}
                onChange={e => setManualPhone(e.target.value)}
                placeholder="ör. 0532 123 4567"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setStep(3); setError('') }} style={btnSecondary}>
                ← Geri
              </button>
              <button onClick={handleManualSave} disabled={loading} style={{ ...btnPrimary, flex: 1 }}>
                {loading ? 'Kaydediliyor...' : '✅ Kaydet ve Başla'}
              </button>
            </div>
          </div>
        )}

        {/* Skip */}
        {step < 3 && (
          <button
            onClick={async () => {
              // Create minimal business and complete onboarding
              if (!businessName.trim()) {
                await fetch('/api/auth/onboarding-status', { method: 'POST' })
                router.push('/')
                return
              }
              await saveBusiness(businessName || 'Yeni İşletme', city || '', null)
            }}
            style={{
              display: 'block', width: '100%', marginTop: '16px',
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)',
              cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline',
            }}
          >
            Şimdilik atla
          </button>
        )}
      </div>

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '6px',
  color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 500,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px', borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)', color: '#fff',
  fontSize: '0.9rem', outline: 'none',
  transition: 'border-color 0.2s', boxSizing: 'border-box',
}

const btnPrimary: React.CSSProperties = {
  width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
  cursor: 'pointer',
  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  color: '#fff', fontSize: '0.95rem', fontWeight: 700,
  transition: 'all 0.2s',
}

const btnSecondary: React.CSSProperties = {
  padding: '14px 20px', borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)',
  color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', fontWeight: 600,
  cursor: 'pointer', transition: 'all 0.2s',
}
