"use client"

import React, { useState, useEffect } from 'react'
import { businessCategories } from '@/lib/locations'
import { Country, State, City } from 'country-state-city'
import { useBusiness } from '@/lib/business-context'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Category → Google Place types mapping + Turkish & English search keywords
const categoryConfig: Record<string, { googleTypes: string[], kwTR: string[], kwEN: string[] }> = {
  "Kafe": { googleTypes: ["cafe", "coffee_shop", "bakery"], kwTR: ["kafe", "kahveci", "kahve dükkanı"], kwEN: ["cafe", "coffee shop"] },
  "Bar/Lounge": { googleTypes: ["bar", "night_club"], kwTR: ["bar", "lounge", "meyhane", "kokteyl bar", "pub"], kwEN: ["bar", "lounge", "pub", "nightclub"] },
  "Restoran": { googleTypes: ["restaurant", "food", "meal_takeaway", "meal_delivery"], kwTR: ["restoran", "lokanta", "kebap", "yemek"], kwEN: ["restaurant", "food"] },
  "Kuaför/Berber": { googleTypes: ["hair_care", "beauty_salon"], kwTR: ["kuaför", "berber", "güzellik salonu"], kwEN: ["hair salon", "barber", "beauty salon"] },
  "Diş Kliniği": { googleTypes: ["dentist", "health"], kwTR: ["diş kliniği", "diş hekimi"], kwEN: ["dental clinic", "dentist"] },
  "Veteriner": { googleTypes: ["veterinary_care"], kwTR: ["veteriner"], kwEN: ["veterinary", "vet clinic"] },
  "Spor Salonu": { googleTypes: ["gym", "health"], kwTR: ["spor salonu", "fitness"], kwEN: ["gym", "fitness center"] },
  "Spa": { googleTypes: ["spa", "beauty_salon"], kwTR: ["spa", "masaj salonu"], kwEN: ["spa", "massage"] },
  "Otel": { googleTypes: ["lodging", "hotel"], kwTR: ["otel", "pansiyon"], kwEN: ["hotel", "hostel"] },
  "Eczane": { googleTypes: ["pharmacy"], kwTR: ["eczane"], kwEN: ["pharmacy"] },
  "Market": { googleTypes: ["supermarket", "grocery_or_supermarket", "convenience_store"], kwTR: ["market", "bakkal", "süpermarket"], kwEN: ["supermarket", "grocery store"] },
  "Pastane/Fırın": { googleTypes: ["bakery"], kwTR: ["pastane", "fırın"], kwEN: ["bakery", "patisserie"] },
}

const getConfigForCategory = (cat: string) => {
  return categoryConfig[cat] || { googleTypes: [], kwTR: [cat.toLowerCase()], kwEN: [cat.toLowerCase()] }
}

// Check if a Google place matches a given category
const placeMatchesCategory = (place: any, cat: string): boolean => {
  const config = getConfigForCategory(cat)
  const placeTypes: string[] = place.types || []
  // Direct type match
  if (placeTypes.some(t => config.googleTypes.includes(t))) return true
  // Name keyword match (Turkish)
  const nameLower = (place.name || "").toLowerCase()
  if (config.kwTR.some(k => nameLower.includes(k.toLowerCase()))) return true
  if (config.kwEN.some(k => nameLower.includes(k.toLowerCase()))) return true
  return false
}

interface DiagnosticLog {
  step: string
  query: string
  resultCount: number
}

export function BusinessSelectorModal({ isOpen, onClose }: ModalProps) {
  const { businesses, setActiveBusinessId, refreshBusinesses } = useBusiness()

  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1: Location
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("TR")
  const [selectedStateCode, setSelectedStateCode] = useState<string>("")
  const [selectedCityName, setSelectedCityName] = useState<string>("")

  // Step 2: Categories
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  // Step 3: Search
  const [isLoading, setIsLoading] = useState(false)
  const [searchInitiated, setSearchInitiated] = useState(false)
  const [searchProgress, setSearchProgress] = useState<string>("")
  const [groupedResults, setGroupedResults] = useState<Record<number, any[]>>({})
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({})
  const [totalFound, setTotalFound] = useState<number>(0)
  const [diagnostics, setDiagnostics] = useState<DiagnosticLog[]>([])
  const [apiError, setApiError] = useState<string>("")
  const [apiWarning, setApiWarning] = useState<string>("")
  const [apiHealthChecked, setApiHealthChecked] = useState(false)

  // ─── RULE 4: Pre-flight API health check on modal open ───
  useEffect(() => {
    if (isOpen && !apiHealthChecked) {
      setApiHealthChecked(true)
      ;(async () => {
        console.log('[BusinessFinder] 🔍 Pre-flight API health check starting...')
        try {
          const res = await fetch('/api/places', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'textsearch', query: 'restaurant istanbul' })
          })
          const data = await res.json()
          
          if (data.error) {
            const errMsg = data.error
            if (errMsg.includes('not set')) {
              setApiWarning('⚠️ API anahtarı ayarlanmamış. .env dosyasında GOOGLE_PLACES_API_KEY değerini girin.')
            } else {
              setApiWarning(`⚠️ API Hatası: ${errMsg}`)
            }
            console.error('[BusinessFinder] ❌ Health check FAILED:', errMsg)
          } else if (data.status === 'REQUEST_DENIED') {
            setApiWarning('⚠️ API anahtarı reddedildi. Google Cloud Console\'dan Places API\'nin aktif olduğunu kontrol edin.')
            console.error('[BusinessFinder] ❌ REQUEST_DENIED:', data.error_message)
          } else if (data.status === 'OVER_QUERY_LIMIT') {
            setApiWarning('⚠️ API kota limiti aşıldı. Google Cloud Billing hesabınızı kontrol edin.')
            console.error('[BusinessFinder] ❌ OVER_QUERY_LIMIT')
          } else if (data.status === 'INVALID_REQUEST') {
            setApiWarning('⚠️ API isteği geçersiz. API key formatını kontrol edin.')
            console.error('[BusinessFinder] ❌ INVALID_REQUEST')
          } else if (data.results && data.results.length > 0) {
            setApiWarning('')
            console.log(`[BusinessFinder] ✅ Places API is working. Health check returned ${data.results.length} results.`)
          } else {
            setApiWarning('⚠️ API bağlantısı var ama sonuç dönmedi. API yapılandırmasını kontrol edin.')
            console.warn('[BusinessFinder] ⚠️ Health check returned 0 results')
          }
        } catch (err) {
          setApiWarning('⚠️ Google Maps API\'ye bağlanılamıyor. İnternet bağlantısını kontrol edin.')
          console.error('[BusinessFinder] ❌ API connection failed:', err)
        }
      })()
    }
  }, [isOpen, apiHealthChecked])

  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setSelectedCountryCode("TR")
      setSelectedStateCode("")
      setSelectedCityName("")
      setSelectedCategories([])
      setGroupedResults({})
      setSearchInitiated(false)
      setIsLoading(false)
      setSearchProgress("")
      setTotalFound(0)
      setDiagnostics([])
      setApiError("")
      setApiHealthChecked(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const countries = Country.getAllCountries()
  const states = selectedCountryCode ? State.getStatesOfCountry(selectedCountryCode) : []
  const cities = selectedStateCode ? City.getCitiesOfState(selectedCountryCode, selectedStateCode) : []

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(cat)) return prev.filter(c => c !== cat)
      if (prev.length >= 5) { alert('En fazla 5 kategori seçebilirsiniz.'); return prev }
      return [...prev, cat]
    })
  }

  const toggleGroup = (level: number) => {
    setExpandedGroups(prev => ({ ...prev, [level]: !prev[level] }))
  }

  // ─── Google Places API helper with RULE 5: Full console logging ───
  const callPlacesAPI = async (body: any): Promise<any> => {
    const startTime = performance.now()
    console.log(`[BusinessFinder] 📡 API Call:`, {
      action: body.action,
      query: body.query || body.keyword || body.address || '(pagetoken)',
      type: body.type || '-',
      location: body.location || '-',
      radius: body.radius || '-',
      hasPageToken: !!body.pagetoken
    })

    const res = await fetch('/api/places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    const elapsed = Math.round(performance.now() - startTime)

    const resultCount = data.results?.length || 0
    const status = data.status || data.error || 'OK'
    const hasNextPage = !!data.next_page_token

    if (resultCount > 0) {
      console.log(`[BusinessFinder] ✅ ${resultCount} results (${elapsed}ms) | status: ${status} | nextPage: ${hasNextPage}`)
    } else if (data.error) {
      console.error(`[BusinessFinder] ❌ ERROR (${elapsed}ms):`, data.error, data.details || '')
    } else {
      console.warn(`[BusinessFinder] ⚠️ 0 results (${elapsed}ms) | status: ${status} | query: ${body.query || body.keyword || '-'}`)
    }

    return data
  }

  // Fetch all pages for a single query (up to 3 pages = 60 results)
  const fetchAllPages = async (initialBody: any, progressLabel: string, logs: DiagnosticLog[]): Promise<any[]> => {
    const allResults: any[] = []
    let pageToken = ""
    let page = 1

    // First request
    setSearchProgress(`${progressLabel} (sayfa ${page})...`)
    const firstData = await callPlacesAPI(initialBody)

    if (firstData.error) {
      setApiError(firstData.error)
      logs.push({ step: progressLabel, query: JSON.stringify(initialBody), resultCount: 0 })
      return []
    }

    if (firstData.results) allResults.push(...firstData.results)
    pageToken = firstData.next_page_token || ""
    logs.push({ step: `${progressLabel} p${page}`, query: JSON.stringify(initialBody), resultCount: firstData.results?.length || 0 })

    // Pagination (Google requires ~2s delay before using next_page_token)
    while (pageToken && page < 3) {
      page++
      setSearchProgress(`${progressLabel} (sayfa ${page})...`)
      await delay(2200)
      const nextData = await callPlacesAPI({ ...initialBody, pagetoken: pageToken })
      if (nextData.results) allResults.push(...nextData.results)
      pageToken = nextData.next_page_token || ""
      logs.push({ step: `${progressLabel} p${page}`, query: `pagetoken`, resultCount: nextData.results?.length || 0 })
    }

    return allResults
  }

  // ─── 5-Step Exhaustive Search ─────────────────────
  const handleSearch = async () => {
    setStep(3)
    setIsLoading(true)
    setSearchInitiated(true)
    setGroupedResults({})
    setTotalFound(0)
    setDiagnostics([])
    setApiError("")

    const countryName = Country.getCountryByCode(selectedCountryCode)?.name || ""
    const stateName = State.getStateByCodeAndCountry(selectedStateCode, selectedCountryCode)?.name || ""
    const districtName = selectedCityName
    const logs: DiagnosticLog[] = []

    try {
      // ── Step 0: Geocode district for Nearby Search ──
      setSearchProgress("Konum koordinatları alınıyor...")
      const geoData = await callPlacesAPI({ action: 'geocode', address: `${districtName}, ${stateName}, ${countryName}` })
      const lat = geoData.lat || null
      const lng = geoData.lng || null
      const locationStr = lat && lng ? `${lat},${lng}` : null
      logs.push({ step: "Geocode", query: `${districtName}, ${stateName}`, resultCount: locationStr ? 1 : 0 })

      // Deduplicated place store
      const placeMap = new Map<string, any>()
      const addPlaces = (places: any[]) => {
        places.forEach(p => {
          if (p.place_id && !placeMap.has(p.place_id)) {
            placeMap.set(p.place_id, p)
          }
        })
      }

      for (const category of selectedCategories) {
        const config = getConfigForCategory(category)

        // ── STEP A: Text Search — Turkish keywords at district level ──
        for (const kw of config.kwTR.slice(0, 2)) {
          const query = `${kw} ${districtName}, ${stateName}, ${countryName}`
          const results = await fetchAllPages(
            { action: 'textsearch', query },
            `A: "${kw}" metin araması`,
            logs
          )
          addPlaces(results)
        }

        // ── STEP B: Nearby Search — if we have coordinates ──
        if (locationStr) {
          for (const gType of config.googleTypes.slice(0, 2)) {
            const results = await fetchAllPages(
              { action: 'nearbysearch', location: locationStr, radius: 5000, type: gType },
              `B: Bölgesel tarama (${gType})`,
              logs
            )
            addPlaces(results)
          }
        }

        // Check if we found anything for this category so far
        const currentResults = Array.from(placeMap.values())
        const matchingCount = currentResults.filter(p => placeMatchesCategory(p, category)).length

        // ── STEP C: If still 0 for this category, broaden to city level ──
        if (matchingCount === 0) {
          for (const kw of config.kwTR.slice(0, 1)) {
            const query = `${kw} ${stateName}, ${countryName}`
            const results = await fetchAllPages(
              { action: 'textsearch', query },
              `C: Şehir genelinde "${kw}"`,
              logs
            )
            addPlaces(results)
          }
        }

        // ── STEP D: If still 0, try English keywords ──
        const matchingCountAfterC = Array.from(placeMap.values()).filter(p => placeMatchesCategory(p, category)).length
        if (matchingCountAfterC === 0) {
          for (const kw of config.kwEN.slice(0, 2)) {
            const query = `${kw} in ${districtName}, ${stateName}, ${countryName}`
            const results = await fetchAllPages(
              { action: 'textsearch', query },
              `D: İngilizce "${kw}"`,
              logs
            )
            addPlaces(results)
          }
        }

        // ── STEP E: If still 0, generic type-only nearby search ──
        const matchingCountAfterD = Array.from(placeMap.values()).filter(p => placeMatchesCategory(p, category)).length
        if (matchingCountAfterD === 0 && locationStr) {
          const results = await fetchAllPages(
            { action: 'nearbysearch', location: locationStr, radius: 10000, type: config.googleTypes[0] },
            `E: Geniş bölge taraması (${config.googleTypes[0]})`,
            logs
          )
          addPlaces(results)
        }
      }

      // ─── Combinatorial matching ───────────────────
      setSearchProgress("Sonuçlar harmanlanıyor ve sınıflandırılıyor...")
      const allPlaces = Array.from(placeMap.values())

      const scoredPlaces = allPlaces.map(place => {
        const matchedCats: string[] = []
        selectedCategories.forEach(cat => {
          if (placeMatchesCategory(place, cat)) matchedCats.push(cat)
        })
        return {
          ...place,
          matched_array: matchedCats,
          match_count: matchedCats.length
        }
      }).filter(p => p.match_count > 0)

      setTotalFound(scoredPlaces.length)

      // Group by match level
      const grouped: Record<number, any[]> = {}
      scoredPlaces.forEach(p => {
        if (!grouped[p.match_count]) grouped[p.match_count] = []
        grouped[p.match_count].push(p)
      })

      // Sort each group by rating desc
      Object.keys(grouped).forEach(k => {
        grouped[Number(k)].sort((a, b) => (b.rating || 0) - (a.rating || 0))
      })

      setGroupedResults(grouped)
      setDiagnostics(logs)

      // Expand top group by default, collapse rest
      const levels = Object.keys(grouped).map(Number)
      const maxLevel = levels.length ? Math.max(...levels) : 0
      const expansions: Record<number, boolean> = {}
      levels.forEach(k => { expansions[k] = k === maxLevel })
      setExpandedGroups(expansions)

      if (scoredPlaces.length < 20 && scoredPlaces.length > 0) {
        console.warn(`[BusinessFinder] Only ${scoredPlaces.length} results found — district may be small or API limits reached.`)
      }

    } catch (err) {
      console.error("Search error:", err)
      setApiError(String(err))
    } finally {
      setIsLoading(false)
      setSearchProgress("")
    }
  }

  const handleSelectBusiness = async (place: any) => {
    const existing = businesses.find(b => b.place_id === place.place_id)
    if (existing) {
      setActiveBusinessId(existing.id)
      onClose()
      return
    }

    try {
      const res = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: place.name,
          location: place.formatted_address || place.vicinity || "Bilinmiyor",
          place_id: place.place_id,
          business_type: (place.matched_array || selectedCategories).join(', '),
          maps_rating: place.rating,
          maps_review_count: place.user_ratings_total
        })
      })
      const data = await res.json()
      if (data.business) {
        await refreshBusinesses()
        setActiveBusinessId(data.business.id)
        onClose()
      }
    } catch (error) {
      console.error("Failed to select/create business", error)
    }
  }

  const isStep1Valid = selectedCountryCode && selectedStateCode && selectedCityName
  const isStep2Valid = selectedCategories.length > 0
  const matchGroupsDesc = Object.keys(groupedResults).map(Number).sort((a, b) => b - a)

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '680px', width: '92%' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
            {step === 1 && "Adım 1: Lokasyon Seçimi"}
            {step === 2 && "Adım 2: Kategori Seçimi"}
            {step === 3 && "Adım 3: İşletmenizi Bulun"}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>
            &times;
          </button>
        </div>

        {/* Status Bar */}
        <div style={{ display: 'flex', gap: '5px', marginBottom: '20px' }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              height: '4px', flex: 1, borderRadius: '2px',
              background: s <= step ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)'
            }} />
          ))}
        </div>

        {/* API Warning Banner (RULE 4) */}
        {apiWarning && (
          <div style={{
            padding: '10px 14px', marginBottom: '16px', borderRadius: '8px',
            background: 'rgba(250, 204, 21, 0.08)', border: '1px solid rgba(250, 204, 21, 0.3)',
            color: '#facc15', fontSize: '0.82rem', lineHeight: '1.4'
          }}>
            {apiWarning}
          </div>
        )}

        {/* ════════ Step 1: Location ════════ */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label className="form-label">Ülke</label>
              <select className="input-field" value={selectedCountryCode} onChange={e => { setSelectedCountryCode(e.target.value); setSelectedStateCode(""); setSelectedCityName("") }}>
                <option value="">Ülke Seçiniz</option>
                {countries.map(c => (<option key={c.isoCode} value={c.isoCode}>{c.name}</option>))}
              </select>
            </div>
            <div>
              <label className="form-label">İl</label>
              <select className="input-field" value={selectedStateCode} onChange={e => { setSelectedStateCode(e.target.value); setSelectedCityName("") }} disabled={!selectedCountryCode}>
                <option value="">İl Seçiniz</option>
                {states.map(s => (<option key={s.isoCode} value={s.isoCode}>{s.name}</option>))}
              </select>
            </div>
            <div>
              <label className="form-label">İlçe</label>
              <select className="input-field" value={selectedCityName} onChange={e => setSelectedCityName(e.target.value)} disabled={!selectedStateCode}>
                <option value="">İlçe Seçiniz</option>
                {cities.map(c => (<option key={c.name} value={c.name}>{c.name}</option>))}
              </select>
            </div>
            <button className="btn btn-primary" style={{ marginTop: '10px' }} disabled={!isStep1Valid} onClick={() => setStep(2)}>
              İleri <span>&rarr;</span>
            </button>
          </div>
        )}

        {/* ════════ Step 2: Categories ════════ */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>İşletmenizi en iyi tanımlayan kategorileri seçin (en fazla 5).</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '300px', overflowY: 'auto', paddingRight: '5px' }}>
              {businessCategories.map(cat => {
                const isSelected = selectedCategories.includes(cat)
                return (
                  <button key={cat} onClick={() => toggleCategory(cat)} style={{
                    padding: '8px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer',
                    border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    background: isSelected ? 'rgba(79, 70, 229, 0.15)' : 'rgba(255,255,255,0.02)',
                    color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                    transition: 'all 0.2s ease'
                  }}>
                    {cat}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(1)}>
                <span>&larr;</span> Geri
              </button>
              <button className="btn btn-primary" style={{ flex: 2 }} disabled={!isStep2Valid} onClick={handleSearch}>
                🔍 Google Maps'te Ara <span>&rarr;</span>
              </button>
            </div>
          </div>
        )}

        {/* ════════ Step 3: Results ════════ */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                📍 {selectedCityName} | {selectedCategories.join(', ')}
              </p>
              {!isLoading && totalFound > 0 && (
                <span style={{ fontSize: '0.8rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
                  ✅ {totalFound} işletme bulundu
                </span>
              )}
            </div>

            <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '5px' }}>

              {/* Loading state */}
              {isLoading && (
                <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div className="loading-spinner" style={{ margin: '0 auto 15px' }}></div>
                  <p style={{ margin: 0, fontWeight: 500 }}>{searchProgress}</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '8px', opacity: 0.6 }}>5 adımlı derinlemesine tarama yapılıyor...</p>
                </div>
              )}

              {/* Grouped results */}
              {!isLoading && matchGroupsDesc.length > 0 && matchGroupsDesc.map(level => {
                const items = groupedResults[level]
                const isMax = level === selectedCategories.length
                const label = isMax 
                  ? `🏆 Tam Eşleşme (${level}/${selectedCategories.length} kategori)` 
                  : level > 1 
                    ? `📌 ${level} Kategori Eşleşmesi` 
                    : `📋 Tekil Kategori`

                return (
                  <div key={level} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div onClick={() => toggleGroup(level)} style={{ 
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 12px', background: isMax ? 'rgba(79,70,229,0.08)' : 'rgba(255,255,255,0.04)', 
                      borderRadius: '8px', cursor: 'pointer', 
                      borderLeft: isMax ? '4px solid var(--accent-primary)' : '4px solid rgba(255,255,255,0.15)' 
                    }}>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', color: isMax ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                        {label}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{items.length} sonuç</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{expandedGroups[level] ? '▼' : '▶'}</span>
                      </div>
                    </div>

                    {expandedGroups[level] && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '8px' }}>
                        {items.map((place, idx) => (
                          <div key={place.place_id || idx} style={{
                            padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)',
                            background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '6px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{place.name}</h4>
                              <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexShrink: 0 }}>
                                {place.rating && (
                                  <span style={{ fontSize: '0.8rem', background: 'rgba(250, 204, 21, 0.1)', color: '#facc15', padding: '2px 8px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                    ★ {place.rating} {place.user_ratings_total ? `(${place.user_ratings_total})` : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {place.formatted_address || place.vicinity || ''}
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {(place.matched_array || []).map((cat: string) => (
                                  <span key={cat} style={{ fontSize: '0.65rem', background: 'var(--accent-primary)', color: 'white', padding: '2px 6px', borderRadius: '10px' }}>
                                    {cat}
                                  </span>
                                ))}
                              </div>
                              <button onClick={() => handleSelectBusiness(place)} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '6px', flexShrink: 0 }}>
                                Seç
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* No results + diagnostic report */}
              {!isLoading && searchInitiated && totalFound === 0 && (
                <div style={{ padding: '20px', borderRadius: '8px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <h4 style={{ margin: '0 0 12px', color: '#ef4444', fontSize: '1rem' }}>⚠️ Sonuç Bulunamadı — Hata Raporu</h4>
                  
                  {apiError && (
                    <div style={{ padding: '10px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px', marginBottom: '12px' }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#ef4444', fontWeight: 600 }}>API Hatası:</p>
                      <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{apiError}</p>
                    </div>
                  )}

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 10px' }}>
                    5 adımlı tarama tamamlandı, hiçbir adımda sonuç bulunamadı. Aşağıda her adımın detayı:
                  </p>

                  <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)' }}>Adım</th>
                          <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)' }}>Sonuç</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diagnostics.map((d, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '4px 8px', color: 'var(--text-primary)' }}>{d.step}</td>
                            <td style={{ padding: '4px 8px', color: d.resultCount > 0 ? '#10b981' : '#ef4444' }}>
                              {d.resultCount} sonuç
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <strong>Olası Nedenler:</strong><br/>
                      • API anahtarı eksik veya geçersiz (.env dosyasını kontrol edin)<br/>
                      • Places API veya Geocoding API Google Cloud'da aktif değil<br/>
                      • Seçilen bölgede bu kategoride işletme yok<br/>
                      • API kullanım limitiniz dolmuş olabilir
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => { setStep(2) }}>
                <span>&larr;</span> Kategori Seçimine Dön
              </button>
            </div>
          </div>
        )}

      </div>
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
        }
        .modal-content {
          background: #121214;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
          max-height: 90vh;
          overflow-y: auto;
        }
        .loading-spinner {
          width: 30px;
          height: 30px;
          border: 3px solid rgba(255,255,255,0.1);
          border-radius: 50%;
          border-top-color: var(--accent-primary);
          animation: spin 1s infinite linear;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
