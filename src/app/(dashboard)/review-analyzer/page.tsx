"use client"

import { useBusiness } from '@/lib/business-context'
import { useState, useEffect } from 'react'

export default function ReviewAnalyzerPage() {
  const { activeBusinessId } = useBusiness()
  const [business, setBusiness] = useState<any>(null)
  
  // Setup view states
  const [needsSetup, setNeedsSetup] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  
  // Analysis states
  const [loading, setLoading] = useState(false)
  const [loadingPhase, setLoadingPhase] = useState(0) // 0: None, 1: Searching competitors, 2: Scraping reviews, 3: AI Analysis
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState('')

  // Fetch business info
  useEffect(() => {
    if (!activeBusinessId) return
    fetch('/api/businesses')
      .then(res => res.json())
      .then(data => {
        const b = data.businesses?.find((x: any) => x.id === activeBusinessId)
        setBusiness(b)
        if (b && !b.place_id && !b.maps_url) {
          setNeedsSetup(true)
        } else {
          setNeedsSetup(false)
        }
        
        // Also fetch previous analysis
        if (!needsSetup) {
           fetch(`/api/analyzer/analysis?business_id=${activeBusinessId}`)
            .then(res => res.json())
            .then(aData => {
              if (aData.analysis) {
                 setResults(aData.analysis)
              }
            })
        }
      })
  }, [activeBusinessId, needsSetup])

  // Fake progress timer during analysis
  useEffect(() => {
    if (!loading) return
    const ts = [
      setTimeout(() => setLoadingPhase(1), 0),
      setTimeout(() => setLoadingPhase(2), 2000), // after 2s
      setTimeout(() => setLoadingPhase(3), 15000), // Assuming scrape takes ~15s
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
        body: JSON.stringify({
           category: searchQuery,
           city: parts[parts.length - 1]?.trim() || '',
           district: parts[0]?.trim() || '',
        })
      })
      const data = await res.json()
      setSearchResults(data.businesses || [])
    } catch (e) {
      console.error(e)
    }
    setSearching(false)
  }

  const handleSelectMaps = async (biz: any) => {
     try {
        await fetch('/api/businesses', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: activeBusinessId,
            place_id: biz.place_id,
            maps_url: biz.url,
            maps_rating: biz.rating,
            maps_review_count: biz.reviews_count
          })
        })
        setNeedsSetup(false)
        // Refresh business
        const data = await (await fetch('/api/businesses')).json()
        setBusiness(data.businesses?.find((x: any) => x.id === activeBusinessId))
     } catch (e) {
        alert("Bağlantı başarısız!")
     }
  }

  const startAnalysis = async () => {
    if (!business) return
    setLoading(true)
    setError('')
    setResults(null)
    setLoadingPhase(0)

    try {
      const parts = business.location?.split(',') || []
      const resp = await fetch('/api/review-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: business.name,
          business_type: business.business_type || '',
          city: parts[parts.length - 1]?.trim() || '',
          district: parts.length > 1 ? parts[0]?.trim() : ''
        }),
      })

      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Analiz başarısız')
      
      // MOCK DB SAVE (You would normally save data to your /api/analyzer/analysis PUT route here)
      setResults(data)

    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  if (!activeBusinessId) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📊</div>
        <h2>İşletme Seçin</h2>
        <p>Analiz özelliklerini kullanmak için sol menüden bir işletme seçin.</p>
      </div>
    )
  }

  if (!business) return <div className="loading-pulse">Yükleniyor...</div>

  // --- 1. SETUP VIEW (Needs Maps Binding) ---
  if (needsSetup) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', paddingTop: '40px' }}>
        <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '16px' }}>📍 Google Maps Entegrasyonu</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
          Derin analiz yapabilmemiz için işletmenizi Google Maps üzerinde bulmamız gerekiyor.
        </p>
        
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'left' }}>
           <div style={{ marginBottom: '16px' }}>
             <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>İşletmenin Maps'teki Adı</label>
             <div style={{ display: 'flex', gap: '8px' }}>
               <input 
                 className="input-field" 
                 value={searchQuery} 
                 onChange={e => setSearchQuery(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && handleMapsSearch()}
                 placeholder={business.name}
               />
               <button className="btn-primary" onClick={handleMapsSearch} disabled={searching}>
                 {searching ? '...' : 'Ara'}
               </button>
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
  }

  // --- 2. MAIN DASHBOARD ---
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2.4rem' }}>Growth Insights</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Yapay zeka destekli sektör analizi ve büyüme stratejileri.</p>
        </div>
        <button 
          className="btn-primary" 
          onClick={startAnalysis}
          disabled={loading}
          style={{ padding: '14px 24px', fontSize: '1rem' }}
        >
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
          <div className="spinner-lg" style={{ marginBottom: '20px' }}></div>
          <h3 style={{ color: 'var(--accent-primary)', marginBottom: '8px' }}>
            {loadingPhase === 1 ? '🔍 Bölgedeki Rakipler Taranıyor...' : 
             loadingPhase === 2 ? '📥 Müşteri Yorumları Toplanıyor...' :
             '🧠 Yapay Zeka Strateji Raporunu Oluşturuyor...'}
          </h3>
          <p style={{ color: 'var(--text-muted)' }}>Bu işlem işletme sayısına göre 2-3 dakika sürebilir. Lütfen bekleyin.</p>
        </div>
      )}

      {results && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Executive Summary Cards */}
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
             <div className="glass-panel stat-card area-card green">
                <div className="stat-label">Sektördeki Fırsatlar</div>
                <div className="stat-value">{Object.keys(results.competitor_strengths_categorized || {}).length || 0}</div>
                <div className="stat-sub">Fark yaratan kategori</div>
             </div>
             <div className="glass-panel stat-card area-card amber">
                <div className="stat-label">Rakip Sorunları</div>
                <div className="stat-value">{Object.values(results.competitor_issues || {}).flat().length || 0}</div>
                <div className="stat-sub">Tespit edilen şikayet</div>
             </div>
             <div className="glass-panel stat-card area-card red">
                <div className="stat-label">Geliştirilmesi Gereken</div>
                <div className="stat-value">{results.own_business_analysis?.weaknesses?.length || 0}</div>
                <div className="stat-sub">Kendi yorumlarımızdan</div>
             </div>
           </div>

           {/* AI CEO Plan */}
           <div className="glass-panel" style={{ padding: '32px', background: 'linear-gradient(180deg, rgba(139,92,246,0.05) 0%, rgba(0,0,0,0) 100%)' }}>
             <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#a78bfa', marginBottom: '20px' }}>
               👑 CEO Eylem Planı
             </h2>
             {Object.entries(results.competitor_strengths_categorized || {}).map(([key, data]: [string, any], i) => (
                <div key={i} style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
                   <h3 style={{ fontSize: '1.2rem', marginBottom: '12px' }}>{key.toUpperCase()}</h3>
                   <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                     {data.leaders?.map((l: string, j: number) => (
                       <span key={j} style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem' }}>🏅 {l}</span>
                     ))}
                   </div>
                   <p style={{ color: 'var(--text-primary)', lineHeight: 1.8, fontSize: '0.95rem' }}>{data.how_to_beat}</p>
                </div>
             ))}
           </div>
           
           {/* Top Competitors */}
           <h2 style={{ marginTop: '16px', fontSize: '1.5rem' }}>Top 3 Rakip Analizi</h2>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
             {results.top_3_competitors?.map((comp: any, i: number) => (
               <div key={i} className="glass-panel" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                     <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{comp.name}</h3>
                     <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>⭐ {comp.rating} ({comp.review_count})</span>
                  </div>
                  
                  <div style={{ color: 'var(--success)', marginBottom: '12px' }}>
                    <strong style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Güçlü Yönleri</strong>
                    <ul style={{ paddingLeft: '20px', fontSize: '0.9rem', marginTop: '4px' }}>
                      {comp.key_strengths?.slice(0,3).map((s: string, j: number) => <li key={j}>{s}</li>)}
                    </ul>
                  </div>

                  <div style={{ color: 'var(--danger)' }}>
                    <strong style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Zayıf Yönleri</strong>
                    <ul style={{ paddingLeft: '20px', fontSize: '0.9rem', marginTop: '4px' }}>
                      {comp.key_weaknesses?.slice(0,3).map((w: string, j: number) => <li key={j}>{w}</li>)}
                    </ul>
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}
    </div>
  )
}
