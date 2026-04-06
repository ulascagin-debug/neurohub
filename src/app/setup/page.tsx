"use client"

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const BUSINESS_CATEGORIES = [
  { value: 'restoran', label: 'Restoran', icon: '🍽️' },
  { value: 'kafe', label: 'Kafe', icon: '☕' },
  { value: 'berber', label: 'Berber', icon: '💈' },
  { value: 'dis_hekimi', label: 'Diş Hekimi', icon: '🦷' },
  { value: 'guzellik', label: 'Güzellik Salonu', icon: '💅' },
  { value: 'bar', label: 'Bar / Lounge', icon: '🍸' },
  { value: 'firin', label: 'Fırın / Pastane', icon: '🍞' },
  { value: 'market', label: 'Market', icon: '🏪' },
  { value: 'spor', label: 'Spor Salonu', icon: '🏋️' },
  { value: 'otel', label: 'Otel / Pansiyon', icon: '🏨' },
  { value: 'eczane', label: 'Eczane', icon: '💊' },
  { value: 'diger', label: 'Diğer', icon: '🎯' },
]

const COUNTRIES = [
  { value: 'Turkey', label: '🇹🇷 Türkiye' },
  { value: 'Germany', label: '🇩🇪 Almanya' },
  { value: 'United Kingdom', label: '🇬🇧 İngiltere' },
  { value: 'United States', label: '🇺🇸 ABD' },
  { value: 'France', label: '🇫🇷 Fransa' },
  { value: 'Netherlands', label: '🇳🇱 Hollanda' },
  { value: 'Italy', label: '🇮🇹 İtalya' },
  { value: 'Spain', label: '🇪🇸 İspanya' },
]

interface MapsBusiness {
  name: string
  url: string
  rating?: number
  reviews_count?: number
  address?: string
  place_id?: string
}

export default function SetupPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1: Business category
  const [businessType, setBusinessType] = useState('')

  // Step 2: Location
  const [country, setCountry] = useState('Turkey')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')

  // Step 3: Business search
  const [businessName, setBusinessName] = useState('')
  const [searchResults, setSearchResults] = useState<MapsBusiness[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState<MapsBusiness | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  // Step 4: Manual entry
  const [manualAddress, setManualAddress] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  // Step 1 → 2
  const handleStep1 = () => {
    if (!businessType) { setError('Lütfen bir iş kolu seçin'); return }
    setError('')
    setStep(2)
  }

  // Step 2 → 3
  const handleStep2 = () => {
    if (!city.trim()) { setError('Şehir gerekli'); return }
    setError('')
    setStep(3)
  }

  // Search businesses
  const handleSearch = async () => {
    if (!businessName.trim()) return
    setSearching(true)
    setHasSearched(true)
    setSelectedBusiness(null)

    try {
      const resp = await fetch('/api/analyzer/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: businessName + (businessType ? ' ' + businessType : ''),
          city,
          district,
          country,
        }),
      })
      const data = await resp.json()
      setSearchResults(data.businesses || [])
    } catch {
      setSearchResults([])
    }
    setSearching(false)
  }

  // Select a business from search results
  const handleSelectBusiness = async (biz: MapsBusiness) => {
    setSelectedBusiness(biz)
    await saveBusiness(
      biz.name,
      biz.address || `${city}${district ? ', ' + district : ''}, ${country}`,
      biz.url,
      biz.rating,
      biz.reviews_count,
      biz.place_id
    )
  }

  // Step 4: Manual entry save
  const handleManualSave = async () => {
    if (!businessName.trim()) { setError('İşletme adı gerekli'); return }
    setError('')
    const location = manualAddress || `${city}${district ? ', ' + district : ''}, ${country}`
    await saveBusiness(businessName, location, null, undefined, undefined, undefined)
  }

  // Save business to DB and complete onboarding
  const saveBusiness = async (
    name: string,
    location: string,
    mapsUrl: string | null,
    rating?: number,
    reviewCount?: number,
    placeId?: string
  ) => {
    setLoading(true)
    setError('')

    try {
      const bizResp = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          location,
          business_type: businessType,
          place_id: placeId || null,
          maps_url: mapsUrl || null,
          maps_rating: rating ?? null,
          maps_review_count: reviewCount ?? null,
        }),
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

  const totalSteps = 4
  const categoryLabel = BUSINESS_CATEGORIES.find(c => c.value === businessType)?.label

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
        maxWidth: step === 3 ? '720px' : '560px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        padding: '48px 40px',
        backdropFilter: 'blur(20px)',
        transition: 'max-width 0.3s ease',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '1.75rem', fontWeight: 800,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: '8px',
          }}>
            🚀 İşletme Kurulumu
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>
            {step === 1 && 'İş kolunuzu seçin'}
            {step === 2 && 'Konumunuzu belirleyin'}
            {step === 3 && 'İşletmenizi Google Maps\'te bulun'}
            {step === 4 && 'Bilgilerinizi manuel girin'}
          </p>
        </div>

        {/* Progress Steps */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '6px', marginBottom: '36px',
        }}>
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
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
              {s < totalSteps && (
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

        {/* ─── Step 1: Business Category ─── */}
        {step === 1 && (
          <div>
            <p style={{
              color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem',
              textAlign: 'center', marginBottom: '20px',
            }}>
              İşletmeniz hangi sektörde?
            </p>
            <div className="category-grid" style={{ marginBottom: '24px' }}>
              {BUSINESS_CATEGORIES.map(cat => (
                <div
                  key={cat.value}
                  className={`category-card ${businessType === cat.value ? 'selected' : ''}`}
                  onClick={() => { setBusinessType(cat.value); setError('') }}
                >
                  <span className="category-icon">{cat.icon}</span>
                  <span className="category-label">{cat.label}</span>
                </div>
              ))}
            </div>
            <button onClick={handleStep1} className="btn-primary" style={{ width: '100%', padding: '14px' }}>
              Devam Et →
            </button>
          </div>
        )}

        {/* ─── Step 2: Location ─── */}
        {step === 2 && (
          <div>
            {/* Selected category badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: '20px', padding: '6px 14px', marginBottom: '20px',
              fontSize: '0.8rem', color: '#a5b4fc',
            }}>
              🏷 {categoryLabel}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Ülke</label>
              <select
                value={country}
                onChange={e => setCountry(e.target.value)}
                className="input-field"
              >
                {COUNTRIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Şehir *</label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="ör. İstanbul"
                className="input-field"
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>İlçe (opsiyonel)</label>
              <input
                type="text"
                value={district}
                onChange={e => setDistrict(e.target.value)}
                placeholder="ör. Kadıköy"
                className="input-field"
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setStep(1); setError('') }} className="btn-secondary" style={{ padding: '14px 20px' }}>
                ← Geri
              </button>
              <button onClick={handleStep2} className="btn-primary" style={{ flex: 1, padding: '14px' }}>
                Devam Et →
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 3: Google Maps Search ─── */}
        {step === 3 && (
          <div>
            {/* Info badges */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <span style={badgeStyle}>🏷 {categoryLabel}</span>
              <span style={badgeStyle}>📍 {city}{district ? `, ${district}` : ''}</span>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>İşletme Adı *</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  placeholder="ör. Fookah Lounge"
                  className="input-field"
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  style={{ flex: 1 }}
                />
                <button onClick={handleSearch} className="btn-primary" disabled={searching || !businessName.trim()}>
                  {searching ? '...' : '🔍 Ara'}
                </button>
              </div>
            </div>

            {/* Search Results */}
            {searching ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }} />
                <p style={{ color: 'rgba(255,255,255,0.5)' }}>Google Maps'te aranıyor...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: '12px' }}>
                  {searchResults.length} işletme bulundu. İşletmenizi seçin:
                </p>
                <div style={{
                  maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px',
                  marginBottom: '20px',
                }}>
                  {searchResults.slice(0, 20).map((biz, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectBusiness(biz)}
                      disabled={loading}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 16px', borderRadius: '10px',
                        border: selectedBusiness?.url === biz.url
                          ? '1px solid #6366f1'
                          : '1px solid rgba(255,255,255,0.08)',
                        background: selectedBusiness?.url === biz.url
                          ? 'rgba(99,102,241,0.12)'
                          : 'rgba(255,255,255,0.02)',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        textAlign: 'left', width: '100%', color: '#fff',
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
                          <div style={{
                            fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            📍 {biz.address}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                        {biz.rating != null && (
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
            ) : hasSearched ? (
              <div style={{ textAlign: 'center', padding: '30px 0', marginBottom: '20px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px', opacity: 0.4 }}>🔍</div>
                <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                  Google Maps'te eşleşen işletme bulunamadı.
                </p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem' }}>
                  Bilgilerinizi aşağıdan manuel olarak girebilirsiniz.
                </p>
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setStep(2); setError(''); setSearchResults([]); setHasSearched(false) }} className="btn-secondary" style={{ padding: '14px 20px' }}>
                ← Geri
              </button>
              <button
                onClick={() => setStep(4)}
                style={{
                  flex: 1, padding: '14px', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.25)',
                  background: 'rgba(245,158,11,0.08)', color: '#f59e0b',
                  cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s',
                }}
              >
                ✏️ Manuel Gir
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
              📝 <strong style={{ color: '#a5b4fc' }}>{businessName || 'İşletmeniz'}</strong> için konum bilgilerini girin.
            </div>

            {!businessName && (
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>İşletme Adı *</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  placeholder="İşletme adınız"
                  className="input-field"
                />
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Adres / Konum</label>
              <input
                type="text"
                value={manualAddress}
                onChange={e => setManualAddress(e.target.value)}
                placeholder={`ör. ${district || 'Kadıköy'}, ${city || 'İstanbul'}`}
                className="input-field"
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setStep(3); setError('') }} className="btn-secondary" style={{ padding: '14px 20px' }}>
                ← Geri
              </button>
              <button onClick={handleManualSave} disabled={loading} className="btn-primary" style={{ flex: 1, padding: '14px' }}>
                {loading ? 'Kaydediliyor...' : '✅ Kaydet ve Başla'}
              </button>
            </div>
          </div>
        )}

        {/* Skip */}
        {step < 3 && (
          <button
            onClick={async () => {
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
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '6px',
  color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 500,
}

const badgeStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '4px',
  background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)',
  borderRadius: '16px', padding: '4px 12px',
  fontSize: '0.75rem', color: '#a5b4fc', fontWeight: 500,
}
