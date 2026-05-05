"use client"

import { useBusiness } from '@/lib/business-context'
import { useState, useEffect } from 'react'

export default function ReviewAnalyzerPage() {
  const { activeBusinessId } = useBusiness()
  const [business, setBusiness] = useState<any>(null)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingPhase, setLoadingPhase] = useState(0)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!activeBusinessId) return
    fetch('/api/businesses')
      .then(res => res.json())
      .then(data => {
        const b = data.businesses?.find((x: any) => x.id === activeBusinessId)
        setBusiness(b)
        setNeedsSetup(b && !b.place_id && !b.maps_url)
        fetch(`/api/analyzer/analysis?business_id=${activeBusinessId}`)
          .then(res => res.json())
          .then(aData => {
            if (aData.analysis?.full_report) {
              try { setResults(JSON.parse(aData.analysis.full_report)) } catch {}
            }
          })
      })
  }, [activeBusinessId])

  useEffect(() => {
    if (!loading) return
    const ts = [
      setTimeout(() => setLoadingPhase(1), 0),
      setTimeout(() => setLoadingPhase(2), 2000),
      setTimeout(() => setLoadingPhase(3), 15000),
    ]
    return () => ts.forEach(clearTimeout)
  }, [loading])

  const handleMapsSearch = async () => {
    if (!searchQuery.trim() || !business) return
    setSearching(true)
    try {
      const parts = business.location?.split(',') || []
      const res = await fetch('/api/analyzer/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: searchQuery, city: parts[parts.length - 1]?.trim() || '', district: parts[0]?.trim() || '' })
      })
      const data = await res.json()
      setSearchResults(data.businesses || [])
    } catch (e) { console.error(e) }
    setSearching(false)
  }

  const handleSelectMaps = async (biz: any) => {
    try {
      await fetch('/api/businesses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeBusinessId, place_id: biz.place_id, maps_url: biz.url, maps_rating: biz.rating, maps_review_count: biz.reviews_count })
      })
      setNeedsSetup(false)
      const data = await (await fetch('/api/businesses')).json()
      setBusiness(data.businesses?.find((x: any) => x.id === activeBusinessId))
    } catch { alert('Bağlantı başarısız!') }
  }

  const startAnalysis = async () => {
    if (!business) return
    setLoading(true); setError(''); setResults(null); setLoadingPhase(0)
    try {
      const parts = business.location?.split(',') || []
      const resp = await fetch('/api/review-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: activeBusinessId,
          business_name: business.name,
          business_type: business.business_type || '',
          city: parts[parts.length - 1]?.trim() || '',
          district: parts.length > 1 ? parts[0]?.trim() : ''
        }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Analiz başarısız')
      setResults(data)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  if (!activeBusinessId) return (
    <div className="empty-state">
      <div className="empty-icon">📊</div>
      <h2>İşletme Seçin</h2>
      <p>Analiz özelliklerini kullanmak için sol menüden bir işletme seçin.</p>
    </div>
  )

  if (!business) return <div className="loading-pulse">Yükleniyor...</div>

  if (needsSetup) return (
    <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', paddingTop: '40px' }}>
      <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '16px' }}>📍 Google Maps Entegrasyonu</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Derin analiz yapabilmemiz için işletmenizi Google Maps üzerinde bulmamız gerekiyor.</p>
      <div className="glass-panel" style={{ padding: '32px', textAlign: 'left' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>İşletmenin Maps'teki Adı</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input className="input-field" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleMapsSearch()} placeholder={business.name} />
            <button className="btn-primary" onClick={handleMapsSearch} disabled={searching}>{searching ? '...' : 'Ara'}</button>
          </div>
        </div>
        {searchResults.length > 0 && (
          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
            {searchResults.map((b, i) => (
              <div key={i} onClick={() => handleSelectMaps(b)} className="glass-panel" style={{ padding: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{b.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{b.address}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#f59e0b', fontWeight: 'bold' }}>⭐ {b.rating}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{b.reviews_count} yorum</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2.4rem' }}>Growth Insights</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Yapay zeka destekli sektör analizi ve büyüme stratejileri.</p>
        </div>
        <button className="btn-primary" onClick={startAnalysis} disabled={loading} style={{ padding: '14px 24px', fontSize: '1rem' }}>
          {loading ? 'Analiz Ediliyor...' : '🚀 Yeni Analiz Başlat'}
        </button>
      </div>

      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', padding: '16px', borderRadius: '10px', marginBottom: '24px' }}>
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', marginBottom: '32px' }}>
          <div className="spinner-lg" style={{ marginBottom: '20px' }} />
          <h3 style={{ color: 'var(--accent-primary)', marginBottom: '8px' }}>
            {loadingPhase === 1 ? '🔍 Bölgedeki Rakipler Taranıyor...' :
             loadingPhase === 2 ? '📥 Müşteri Yorumları Toplanıyor...' :
             '🧠 Yapay Zeka Strateji Raporunu Oluşturuyor...'}
          </h3>
          <p style={{ color: 'var(--text-muted)' }}>Bu işlem 2-3 dakika sürebilir. Lütfen bekleyin.</p>
        </div>
      )}

      {results && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
          {results.layered_analysis ? (
            Object.entries(results.layered_analysis).map(([groupName, subsets]: [string, any], gIdx) => (
              <div key={gIdx}>
                <h2 style={{ fontSize: '2rem', marginBottom: '24px', borderBottom: '2px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }} className="text-gradient">
                  {groupName}
                </h2>

                {Object.entries(subsets).map(([subsetName, a]: [string, any], sIdx) => (
                  <div key={sIdx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '32px', marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '1.4rem', marginBottom: '24px', color: 'var(--accent-primary)' }}>🏷️ {subsetName}</h3>

                    {/* Stat Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                      <div className="glass-panel stat-card area-card green">
                        <div className="stat-label">Rakip Analizi</div>
                        <div className="stat-value">
                          {a.top_3_competitors?.length ||
                           Object.keys(a.competitor_profiles?.profiles || {}).length ||
                           a.competitors?.length || 0}
                        </div>
                        <div className="stat-sub">Analiz edilen rakip</div>
                      </div>
                      <div className="glass-panel stat-card area-card amber">
                        <div className="stat-label">Rakip Sorunları</div>
                        <div className="stat-value">{Object.values(a.competitor_issues || {}).flat().length || 0}</div>
                        <div className="stat-sub">Tespit edilen şikayet</div>
                      </div>
                      <div className="glass-panel stat-card area-card red">
                        <div className="stat-label">Hızlı Kazanım</div>
                        <div className="stat-value">{a.priority_matrix?.quick_wins?.length ?? a.recommendations?.weekly?.length ?? 0}</div>
                        <div className="stat-sub">Bu hafta uygulanabilir</div>
                      </div>
                      {a.growth_simulation?.rating_projection && (
                        <div className="glass-panel stat-card area-card">
                          <div className="stat-label">Rating Projeksiyonu</div>
                          <div className="stat-value" style={{ fontSize: '1.1rem' }}>
                            {a.growth_simulation.rating_projection.current} → {a.growth_simulation.rating_projection.after_full_plan}
                          </div>
                          <div className="stat-sub">Tam plan sonrası</div>
                        </div>
                      )}
                    </div>

                    {/* CEO Eylem Planı — competitor_profiles */}
                    {a.competitor_profiles?.profiles && Object.keys(a.competitor_profiles.profiles).length > 0 && (
                      <div className="glass-panel" style={{ padding: '28px', background: 'linear-gradient(180deg, rgba(139,92,246,0.05) 0%, transparent 100%)', marginBottom: '28px' }}>
                        <h4 style={{ color: '#a78bfa', marginBottom: '8px', fontSize: '1.2rem' }}>👑 CEO Eylem Planı — Rakip Profilleri</h4>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '20px' }}>{a.competitor_profiles.threat_summary}</p>
                        {Object.entries(a.competitor_profiles.profiles).map(([name, p]: [string, any], i) => (
                          <div key={i} style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <h5 style={{ margin: 0 }}>{name}</h5>
                              <span style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: '12px', background: p.threat_level === 'high' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: p.threat_level === 'high' ? '#ef4444' : '#f59e0b' }}>
                                {p.threat_level === 'high' ? '🔴 Yüksek' : '🟡 Orta'} — Skor: {p.threat_score}
                              </span>
                            </div>
                            <p style={{ fontSize: '0.88rem', margin: '6px 0' }}>💡 <strong>Nasıl Yenilir:</strong> {p.how_to_beat}</p>
                            {p.monthly_loss_estimate && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📉 {p.monthly_loss_estimate}</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Haftalık Öneriler */}
                    {a.recommendations?.weekly?.length > 0 && (
                      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
                        <h4 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>⚡ Bu Hafta Yapılacaklar</h4>
                        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {a.recommendations.weekly.map((r: string, i: number) => <li key={i} style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>{r}</li>)}
                        </ul>
                      </div>
                    )}

                    {/* Top 3 Rakip */}
                    {a.top_3_competitors?.length > 0 && (
                      <>
                        <h4 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>🏆 Top Rakip Analizi</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                          {a.top_3_competitors.map((comp: any, i: number) => (
                            <div key={i} className="glass-panel" style={{ padding: '20px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <h5 style={{ margin: 0 }}>{comp.name}</h5>
                                <span style={{ color: '#f59e0b', fontSize: '0.85rem', fontWeight: 'bold' }}>⭐ {comp.rating} ({comp.review_count})</span>
                              </div>
                              <div style={{ color: '#10b981', marginBottom: '8px' }}>
                                <strong style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Güçlü</strong>
                                <ul style={{ paddingLeft: '16px', fontSize: '0.85rem', marginTop: '4px' }}>
                                  {comp.key_strengths?.slice(0, 3).map((s: string, j: number) => <li key={j}>{s}</li>)}
                                </ul>
                              </div>
                              <div style={{ color: '#ef4444' }}>
                                <strong style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Zayıf</strong>
                                <ul style={{ paddingLeft: '16px', fontSize: '0.85rem', marginTop: '4px' }}>
                                  {comp.key_weaknesses?.slice(0, 3).map((w: string, j: number) => <li key={j}>{w}</li>)}
                                </ul>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Growth Simulation */}
                    {a.growth_simulation?.summary && (
                      <div className="glass-panel" style={{ padding: '20px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <h4 style={{ color: '#10b981', marginBottom: '8px' }}>📈 Büyüme Simülasyonu</h4>
                        <p style={{ fontSize: '0.9rem' }}>{a.growth_simulation.summary}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--warning)', padding: '40px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
              Analiz verisi bulunamadı. Yeni analiz başlatın.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
