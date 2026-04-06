"use client"

import { useState, useEffect, useCallback } from 'react'
import { useBusiness } from '@/lib/business-context'

type TabKey = 'week' | 'month' | 'year'

interface BusinessInfo {
  name: string
  rating: number
  review_count: number
  url?: string
}

interface AnalysisResult {
  target_business: BusinessInfo | null
  competitors: BusinessInfo[]
  strengths: string[]
  weaknesses: string[]
  equal_areas: string[]
  recommendations: { week: string[]; month: string[]; year: string[] }
  growth_score: number
  growth_summary: string
  full_report?: string
  updated_at?: string
}

interface Competitor {
  id: string
  place_id: string
  name: string
  address?: string
  rating?: number
  review_count?: number
}

interface Snapshot {
  snapshot_date: string
  rating: number | null
  review_count: number | null
  source: string
  business_name: string | null
}

const BUSINESS_TYPES = [
  { value: 'berber', label: 'Berber' },
  { value: 'dis_hekimi', label: 'Diş Hekimi' },
  { value: 'kafe', label: 'Kafe' },
  { value: 'restoran', label: 'Restoran' },
  { value: 'guzellik', label: 'Güzellik Salonu' },
  { value: 'bar', label: 'Bar / Lounge' },
  { value: 'firin', label: 'Fırın / Pastane' },
  { value: 'diger', label: 'Diğer' },
]

export default function ReviewAnalyzerPage() {
  const { activeBusinessId, activeBusiness } = useBusiness()

  // ── Form State ──
  const [businessName, setBusinessName] = useState('')
  const [city, setCity] = useState('')
  const [businessType, setBusinessType] = useState('')

  // ── Result State ──
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<TabKey>('week')

  // ── Competitor State ──
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [compSearchQuery, setCompSearchQuery] = useState('')
  const [compSearchResults, setCompSearchResults] = useState<any[]>([])
  const [compSearching, setCompSearching] = useState(false)
  const [addingComp, setAddingComp] = useState(false)

  // ── Snapshot State ──
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])

  // ── Last Analysis Data ──
  const [lastAnalysis, setLastAnalysis] = useState<any>(null)

  // Load existing data
  const loadData = useCallback(async () => {
    if (!activeBusinessId) return

    // Load competitors
    try {
      const res = await fetch(`/api/competitors?business_id=${activeBusinessId}`)
      const data = await res.json()
      if (data.competitors) setCompetitors(data.competitors)
    } catch {}

    // Load snapshots (last 30 days)
    try {
      const res = await fetch(`/api/review-snapshots?business_id=${activeBusinessId}&days=30`)
      const data = await res.json()
      if (data.snapshots) setSnapshots(data.snapshots)
    } catch {}

    // Load last analysis
    try {
      const res = await fetch(`/api/analyzer/analysis?business_id=${activeBusinessId}`)
      const data = await res.json()
      if (data.analysis) {
        setLastAnalysis(data.analysis)
        // Re-hydrate result from stored analysis
        if (data.analysis.full_report) {
          setResult(normalizeStoredAnalysis(data.analysis))
        }
      }
    } catch {}
  }, [activeBusinessId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Pre-fill form from active business
  useEffect(() => {
    if (activeBusiness) {
      setBusinessName(activeBusiness.name || '')
      const parts = (activeBusiness.location || '').split(',')
      setCity(parts[0]?.trim() || '')
      setBusinessType(activeBusiness.business_type || '')
    }
  }, [activeBusiness])

  // ── Analysis ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessName.trim() || !city.trim() || !businessType) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const resp = await fetch('/api/review-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: businessName.trim(),
          city: city.trim(),
          business_type: businessType,
        }),
      })

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}))
        throw new Error(errData.error || `Hata: ${resp.status}`)
      }

      const data = await resp.json()
      setResult(normalizeResult(data))
      loadData() // Refresh snapshots etc
    } catch (err: any) {
      setError(err.message || 'Analiz servisi şu an kullanılamıyor')
    } finally {
      setLoading(false)
    }
  }

  // ── Competitor Actions ──
  const searchCompetitors = async () => {
    if (!compSearchQuery.trim()) return
    setCompSearching(true)
    try {
      const res = await fetch('/api/competitors/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: compSearchQuery,
          location: city || activeBusiness?.location?.split(',')[0]?.trim() || '',
        }),
      })
      const data = await res.json()
      setCompSearchResults(Array.isArray(data) ? data : data.places || [])
    } catch {
      setCompSearchResults([])
    }
    setCompSearching(false)
  }

  const addCompetitor = async (place: any) => {
    if (!activeBusinessId) return
    setAddingComp(true)
    try {
      await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: activeBusinessId,
          place_id: place.place_id,
          name: place.name,
          address: place.address,
          rating: place.rating,
          review_count: place.user_ratings_total,
        }),
      })
      setShowAddModal(false)
      setCompSearchQuery('')
      setCompSearchResults([])
      loadData()
    } catch {}
    setAddingComp(false)
  }

  const deleteCompetitor = async (id: string) => {
    try {
      await fetch('/api/competitors', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setCompetitors(prev => prev.filter(c => c.id !== id))
    } catch {}
  }

  // ── Render ──
  if (!activeBusinessId) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🏢</div>
        <h3>İşletme Seçin</h3>
        <p>Sidebar&apos;dan bir işletme seçerek Review Analyzer&apos;ı kullanabilirsiniz.</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h1 className="text-gradient">Review Analyzer</h1>
        {lastAnalysis?.updated_at && (
          <div style={{
            fontSize: '0.75rem', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            🕐 Son analiz: {new Date(lastAnalysis.updated_at).toLocaleDateString('tr-TR', {
              day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </div>
        )}
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Google yorumlarını analiz ederek rakiplerinize karşı konumunuzu keşfedin.
      </p>

      {/* ═══ Top Stats Cards ═══ */}
      {activeBusiness && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="glass-panel stat-card">
            <div className="stat-label">Rating</div>
            <div className="stat-value" style={{ color: activeBusiness.maps_rating ? getRatingColor(activeBusiness.maps_rating) : 'var(--text-primary)' }}>
              {activeBusiness.maps_rating ? `⭐ ${activeBusiness.maps_rating.toFixed(1)}` : '—'}
            </div>
          </div>
          <div className="glass-panel stat-card">
            <div className="stat-label">Toplam Yorum</div>
            <div className="stat-value">{activeBusiness.maps_review_count ?? '—'}</div>
          </div>
          <div className="glass-panel stat-card">
            <div className="stat-label">Rakip Sayısı</div>
            <div className="stat-value">{competitors.length}</div>
          </div>
          <div className="glass-panel stat-card">
            <div className="stat-label">Büyüme Skoru</div>
            <div className="stat-value" style={{ color: result ? getScoreColor(result.growth_score) : 'var(--text-primary)' }}>
              {result?.growth_score ?? '—'}
            </div>
            {result && <div className="stat-sub">/100</div>}
          </div>
        </div>
      )}

      {/* ═══ Analysis Form ═══ */}
      <form onSubmit={handleSubmit}>
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
            <span>🔬</span> Yeni Analiz
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>İşletme Adı</label>
              <input
                id="business-name-input"
                className="input-field"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                placeholder="ör: Ali'nin Berber Salonu"
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Şehir / Konum</label>
              <input
                id="city-input"
                className="input-field"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="ör: İstanbul, Kadıköy"
                required
              />
            </div>
            <div>
              <label style={labelStyle}>İşletme Türü</label>
              <select
                id="business-type-select"
                className="input-field"
                value={businessType}
                onChange={e => setBusinessType(e.target.value)}
                required
              >
                <option value="" disabled>Seçiniz...</option>
                {BUSINESS_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            id="analyze-btn"
            className="btn-primary"
            type="submit"
            disabled={loading || !businessName.trim() || !city.trim() || !businessType}
          >
            {loading ? (
              <><span className="spinner" /> Analiz Ediliyor...</>
            ) : '🔍 Analiz Başlat'}
          </button>
          {error && (
            <div style={{
              marginTop: '12px', padding: '12px 16px', borderRadius: 'var(--radius-md)',
              background: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
              color: 'var(--danger)', fontSize: '0.85rem',
            }}>
              ⚠️ {error}
            </div>
          )}
        </div>
      </form>

      {/* ═══ Loading State ═══ */}
      {loading && (
        <div className="glass-panel" style={{ padding: '60px 40px', textAlign: 'center', marginBottom: '24px' }}>
          <div className="loading-pulse" style={{ fontSize: '3rem', marginBottom: '16px' }}>🔬</div>
          <h3 style={{ marginBottom: '8px' }}>Analiz Devam Ediyor...</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Google yorumları taranıyor ve rakip analizi yapılıyor.
          </p>
          <div style={{ marginTop: '24px' }}>
            <div style={{
              width: '240px', height: '4px', borderRadius: '2px',
              background: 'rgba(255,255,255,0.06)', margin: '0 auto', overflow: 'hidden',
            }}>
              <div className="progress-slide" />
            </div>
          </div>
        </div>
      )}

      {/* ═══ Results ═══ */}
      {result && !loading && (
        <div className="animate-slide-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Business vs Competitors Cards */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚔️ İşletmen vs Rakipler
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {result.target_business && (
                <BusinessCard business={result.target_business} isTarget />
              )}
              {result.competitors.map((comp, i) => (
                <BusinessCard key={i} business={comp} />
              ))}
            </div>
          </div>

          {/* Strengths / Weaknesses / Equal */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div className="glass-panel area-card green">
              <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                💪 Güçlü Alanlar
              </h4>
              <ItemList items={result.strengths} color="var(--success)" />
            </div>
            <div className="glass-panel area-card red">
              <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📉 Zayıf Alanlar
              </h4>
              <ItemList items={result.weaknesses} color="var(--danger)" />
            </div>
            <div className="glass-panel area-card amber">
              <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⚖️ Eşit Alanlar
              </h4>
              <ItemList items={result.equal_areas} color="var(--warning)" />
            </div>
          </div>

          {/* Recommendations */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              💡 Tavsiyeler
            </h3>
            <div className="tab-bar" style={{ marginBottom: '16px' }}>
              {([
                { key: 'week' as TabKey, label: 'Bu Hafta', icon: '⚡' },
                { key: 'month' as TabKey, label: 'Bu Ay', icon: '📅' },
                { key: 'year' as TabKey, label: 'Bu Yıl', icon: '🚀' },
              ]).map(tab => (
                <button
                  key={tab.key}
                  className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <span>{tab.icon}</span> {tab.label}
                </button>
              ))}
            </div>
            <div className="animate-fade-in">
              {(result.recommendations[activeTab] || []).length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {result.recommendations[activeTab].map((rec, i) => (
                    <li key={i} style={{
                      padding: '12px 16px', borderRadius: 'var(--radius-md)',
                      background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6,
                      display: 'flex', gap: '10px', alignItems: 'flex-start',
                    }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '22px', height: '22px', borderRadius: '6px',
                        background: 'rgba(99,102,241,0.15)', color: 'var(--accent-primary)',
                        fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
                      }}>{i + 1}</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                  Bu zaman dilimi için tavsiye bulunamadı.
                </p>
              )}
            </div>
          </div>

          {/* Growth Potential */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📈 Büyüme Potansiyeli
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
                <svg viewBox="0 0 120 120" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke={getScoreColor(result.growth_score)} strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(result.growth_score / 100) * 314} 314`}
                    style={{ transition: 'stroke-dasharray 1s ease' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: getScoreColor(result.growth_score) }}>
                    {result.growth_score}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>/100</div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)',
                  overflow: 'hidden', marginBottom: '10px',
                }}>
                  <div style={{
                    height: '100%', width: `${result.growth_score}%`, borderRadius: '3px',
                    background: `linear-gradient(90deg, ${getScoreColor(result.growth_score)}, ${getScoreColorEnd(result.growth_score)})`,
                    transition: 'width 1s ease',
                  }} />
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                  {result.growth_summary || getDefaultGrowthText(result.growth_score)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Competitor Management ═══ */}
      <div className="glass-panel" style={{ padding: '24px', marginTop: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🏢 Takip Edilen Rakipler
          </h3>
          <button className="btn-primary" onClick={() => setShowAddModal(true)} style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
            + Rakip Ekle
          </button>
        </div>
        {competitors.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {competitors.map(comp => (
              <div key={comp.id} style={{
                padding: '16px', borderRadius: 'var(--radius-md)',
                background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h4 style={{
                    fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                  }}>{comp.name}</h4>
                  <button onClick={() => deleteCompetitor(comp.id)} style={{
                    background: 'none', border: 'none', color: 'var(--danger)',
                    cursor: 'pointer', fontSize: '0.7rem', padding: '2px 6px', flexShrink: 0,
                  }}>✕</button>
                </div>
                {comp.address && (
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px' }}>📍 {comp.address}</p>
                )}
                <div style={{ display: 'flex', gap: '12px' }}>
                  {comp.rating != null && (
                    <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700 }}>⭐ {comp.rating}</span>
                  )}
                  {comp.review_count != null && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{comp.review_count} yorum</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '16px' }}>
            Henüz rakip eklenmemiş. Rakiplerinizi ekleyerek günlük takip başlatın.
          </p>
        )}
      </div>

      {/* ═══ Trend / Snapshot History ═══ */}
      {snapshots.length > 0 && (
        <div className="glass-panel" style={{ padding: '24px', marginTop: '24px' }}>
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📊 Rating Geçmişi (Son 30 Gün)
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="styled-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>İşletme</th>
                  <th>Kaynak</th>
                  <th>Rating</th>
                  <th>Yorum Sayısı</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.slice(0, 20).map((snap, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: '0.8rem' }}>
                      {new Date(snap.snapshot_date).toLocaleDateString('tr-TR')}
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{snap.business_name || '—'}</td>
                    <td>
                      <span className={`score-badge ${snap.source === 'own' ? 'high' : 'medium'}`}>
                        {snap.source === 'own' ? 'Kendi' : 'Rakip'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: snap.rating ? getRatingColor(snap.rating) : 'inherit' }}>
                      {snap.rating ? `⭐ ${snap.rating.toFixed(1)}` : '—'}
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{snap.review_count ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ Add Competitor Modal ═══ */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>🏢 Rakip Ekle</h3>
              <button onClick={() => setShowAddModal(false)} style={{
                background: 'none', border: 'none', color: 'var(--text-secondary)',
                cursor: 'pointer', fontSize: '1.2rem',
              }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                className="input-field"
                value={compSearchQuery}
                onChange={e => setCompSearchQuery(e.target.value)}
                placeholder="Rakip işletme adı..."
                onKeyDown={e => e.key === 'Enter' && searchCompetitors()}
                style={{ flex: 1 }}
              />
              <button className="btn-primary" onClick={searchCompetitors} disabled={compSearching}>
                {compSearching ? '...' : 'Ara'}
              </button>
            </div>

            {compSearchResults.length > 0 && (
              <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {compSearchResults.map((place, i) => (
                  <button
                    key={i}
                    onClick={() => addCompetitor(place)}
                    disabled={addingComp}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 14px', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)',
                      cursor: 'pointer', textAlign: 'left', width: '100%', color: '#fff',
                      transition: 'all 0.2s',
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)' }}
                    onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{place.name}</div>
                      {place.address && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {place.address}
                        </div>
                      )}
                    </div>
                    {place.rating && (
                      <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700, marginLeft: '10px' }}>
                        ⭐ {place.rating}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Sub-components ─── */

function BusinessCard({ business, isTarget }: { business: BusinessInfo; isTarget?: boolean }) {
  return (
    <div style={{
      padding: '18px', borderRadius: 'var(--radius-md)',
      background: isTarget
        ? 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.06))'
        : 'rgba(255,255,255,0.02)',
      border: `1px solid ${isTarget ? 'rgba(99,102,241,0.3)' : 'var(--border-color)'}`,
      position: 'relative',
    }}>
      {isTarget && (
        <div style={{
          position: 'absolute', top: '-8px', right: '12px',
          background: 'var(--accent-gradient)', color: '#fff',
          fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px',
          borderRadius: '4px', textTransform: 'uppercase',
        }}>Senin İşletmen</div>
      )}
      <h4 style={{
        fontSize: '0.85rem', marginBottom: '10px',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{business.name}</h4>
      <div style={{ display: 'flex', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '3px' }}>Rating</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: getRatingColor(business.rating) }}>
            ⭐ {business.rating?.toFixed(1) || '—'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '3px' }}>Yorumlar</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{business.review_count ?? '—'}</div>
        </div>
      </div>
    </div>
  )
}

function ItemList({ items, color }: { items: string[]; color: string }) {
  if (items.length === 0) return <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>Veri bulunamadı</p>
  return (
    <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.83rem', lineHeight: 1.5 }}>
          <span style={{ color, flexShrink: 0, marginTop: '2px' }}>•</span>
          {item}
        </li>
      ))}
    </ul>
  )
}

/* ─── Helpers ─── */

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '4px',
  color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 500,
}

function getScoreColor(score: number): string {
  if (score >= 70) return '#10b981'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

function getScoreColorEnd(score: number): string {
  if (score >= 70) return '#34d399'
  if (score >= 40) return '#fbbf24'
  return '#f87171'
}

function getRatingColor(rating: number): string {
  if (rating >= 4.5) return '#10b981'
  if (rating >= 4.0) return '#f59e0b'
  if (rating >= 3.0) return '#fb923c'
  return '#ef4444'
}

function getDefaultGrowthText(score: number): string {
  if (score >= 80) return 'Mükemmel bir büyüme potansiyeliniz var! Rakiplerinizin zayıf noktalarını değerlendirerek pazar payınızı hızla artırabilirsiniz.'
  if (score >= 60) return 'İyi bir büyüme potansiyeli mevcut. Tavsiyelerimizi uyguladığınızda önemli gelişmeler görebilirsiniz.'
  if (score >= 40) return 'Orta düzeyde büyüme potansiyeli. Zayıf alanlarınıza odaklanarak fark yaratabilirsiniz.'
  return 'Büyüme için temel iyileştirmeler gerekiyor. Öncelikle zayıf alanlarınızı güçlendirmeye odaklanın.'
}

function normalizeResult(data: any): AnalysisResult {
  if (data.target_business || data.competitors || data.strengths) {
    return {
      target_business: data.target_business || null,
      competitors: Array.isArray(data.competitors) ? data.competitors : [],
      strengths: toStringArray(data.strengths),
      weaknesses: toStringArray(data.weaknesses),
      equal_areas: toStringArray(data.equal_areas),
      recommendations: {
        week: toStringArray(data.recommendations?.week || data.recommendations?.this_week),
        month: toStringArray(data.recommendations?.month || data.recommendations?.this_month),
        year: toStringArray(data.recommendations?.year || data.recommendations?.this_year),
      },
      growth_score: data.growth_score ?? data.growth_potential?.score ?? 50,
      growth_summary: data.growth_summary || data.growth_potential?.summary || '',
      full_report: data.full_report || data.result || '',
      updated_at: data.updated_at,
    }
  }
  if (data.result && typeof data.result === 'string') {
    const stats = data.stats || {}
    return {
      target_business: stats.target_business || null,
      competitors: Array.isArray(stats.competitors) ? stats.competitors : [],
      strengths: toStringArray(stats.strengths || stats.target_good_reviews),
      weaknesses: toStringArray(stats.weaknesses || stats.competitor_bad_reviews),
      equal_areas: toStringArray(stats.equal_areas),
      recommendations: {
        week: toStringArray(stats.recommendations?.week),
        month: toStringArray(stats.recommendations?.month),
        year: toStringArray(stats.recommendations?.year),
      },
      growth_score: stats.growth_score ?? 50,
      growth_summary: stats.growth_summary || '',
      full_report: data.result,
    }
  }
  return {
    target_business: null, competitors: [], strengths: [], weaknesses: [], equal_areas: [],
    recommendations: { week: [], month: [], year: [] },
    growth_score: 50, growth_summary: '',
    full_report: JSON.stringify(data, null, 2),
  }
}

function normalizeStoredAnalysis(analysis: any): AnalysisResult {
  return {
    target_business: null,
    competitors: [],
    strengths: toStringArray(analysis.strengths),
    weaknesses: toStringArray(analysis.weaknesses),
    equal_areas: [],
    recommendations: {
      week: analysis.time_1_week ? analysis.time_1_week.split('\n').filter((s: string) => s.trim()) : [],
      month: analysis.time_1_month ? analysis.time_1_month.split('\n').filter((s: string) => s.trim()) : [],
      year: analysis.time_1_year ? analysis.time_1_year.split('\n').filter((s: string) => s.trim()) : [],
    },
    growth_score: analysis.competitor_weakness_count ? Math.min(100, analysis.competitor_weakness_count * 15) : 50,
    growth_summary: '',
    full_report: analysis.full_report || '',
    updated_at: analysis.updated_at,
  }
}

function toStringArray(val: any): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val.map(v => typeof v === 'string' ? v : JSON.stringify(v))
  if (typeof val === 'string') {
    try { const parsed = JSON.parse(val); if (Array.isArray(parsed)) return parsed } catch {}
    return val.split('\n').filter((s: string) => s.trim())
  }
  return []
}
