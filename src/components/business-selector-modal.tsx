"use client"

import React, { useState, useEffect } from 'react'
import { businessCategories } from '@/lib/locations'
import { Country, State, City } from 'country-state-city'
import { useBusiness } from '@/lib/business-context'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
}

// Category → OSM type mapping (no API key needed)
const categoryConfig: Record<string, { osmTypes: string[], kwTR: string[], kwEN: string[] }> = {
  "Kafe":          { osmTypes: ["cafe", "coffee_shop"],                    kwTR: ["kafe", "kahveci", "kahve"],        kwEN: ["cafe", "coffee"] },
  "Bar/Lounge":    { osmTypes: ["bar", "pub", "nightclub"],                kwTR: ["bar", "lounge", "meyhane", "pub"], kwEN: ["bar", "lounge", "pub"] },
  "Restoran":      { osmTypes: ["restaurant", "fast_food", "food_court"],  kwTR: ["restoran", "lokanta", "kebap"],    kwEN: ["restaurant", "food"] },
  "Kuaför/Berber": { osmTypes: ["hairdresser", "beauty"],                  kwTR: ["kuaför", "berber"],                kwEN: ["hair salon", "barber"] },
  "Diş Kliniği":  { osmTypes: ["dentist"],                                kwTR: ["diş kliniği", "diş hekimi"],      kwEN: ["dental", "dentist"] },
  "Veteriner":     { osmTypes: ["veterinary"],                             kwTR: ["veteriner"],                      kwEN: ["vet", "veterinary"] },
  "Spor Salonu":   { osmTypes: ["fitness_centre", "gym", "sports_centre"], kwTR: ["spor salonu", "fitness"],         kwEN: ["gym", "fitness"] },
  "Spa":           { osmTypes: ["spa", "sauna"],                           kwTR: ["spa", "masaj"],                   kwEN: ["spa", "massage"] },
  "Otel":          { osmTypes: ["hotel", "hostel", "guest_house", "motel"],kwTR: ["otel", "pansiyon"],               kwEN: ["hotel", "hostel"] },
  "Eczane":        { osmTypes: ["pharmacy"],                               kwTR: ["eczane"],                         kwEN: ["pharmacy"] },
  "Market":        { osmTypes: ["supermarket", "convenience", "grocery"],  kwTR: ["market", "bakkal"],               kwEN: ["supermarket", "grocery"] },
  "Pastane/Fırın": { osmTypes: ["bakery", "pastry", "confectionery"],      kwTR: ["pastane", "fırın"],               kwEN: ["bakery"] },
}

const getConfig = (cat: string) =>
  categoryConfig[cat] || { osmTypes: [], kwTR: [cat.toLowerCase()], kwEN: [cat.toLowerCase()] }

const placeMatchesCategory = (place: any, cat: string): boolean => {
  const cfg = getConfig(cat)
  const types: string[] = place.types || []
  if (types.some(t => cfg.osmTypes.includes(t))) return true
  const name = (place.name || '').toLowerCase()
  if (cfg.kwTR.some(k => name.includes(k))) return true
  if (cfg.kwEN.some(k => name.includes(k))) return true
  return false
}

interface DiagnosticLog { step: string; query: string; resultCount: number }

export function BusinessSelectorModal({ isOpen, onClose }: ModalProps) {
  const { businesses, setActiveBusinessId, refreshBusinesses } = useBusiness()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedCountryCode, setSelectedCountryCode] = useState('TR')
  const [selectedStateCode, setSelectedStateCode] = useState('')
  const [selectedCityName, setSelectedCityName] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchInitiated, setSearchInitiated] = useState(false)
  const [searchProgress, setSearchProgress] = useState('')
  const [groupedResults, setGroupedResults] = useState<Record<number, any[]>>({})
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({})
  const [totalFound, setTotalFound] = useState(0)
  const [diagnostics, setDiagnostics] = useState<DiagnosticLog[]>([])
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setStep(1); setSelectedCountryCode('TR'); setSelectedStateCode('')
      setSelectedCityName(''); setSelectedCategories([]); setGroupedResults({})
      setSearchInitiated(false); setIsLoading(false); setSearchProgress('')
      setTotalFound(0); setDiagnostics([]); setApiError('')
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

  const toggleGroup = (level: number) =>
    setExpandedGroups(prev => ({ ...prev, [level]: !prev[level] }))

  const callAPI = async (body: any) => {
    const res = await fetch('/api/places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    return res.json()
  }

  const handleSearch = async () => {
    setStep(3); setIsLoading(true); setSearchInitiated(true)
    setGroupedResults({}); setTotalFound(0); setDiagnostics([]); setApiError('')

    const countryName = Country.getCountryByCode(selectedCountryCode)?.name || ''
    const stateName = State.getStateByCodeAndCountry(selectedStateCode, selectedCountryCode)?.name || ''
    const logs: DiagnosticLog[] = []

    try {
      // Step 1: Geocode
      setSearchProgress('Konum koordinatları alınıyor...')
      const geoData = await callAPI({
        action: 'geocode',
        address: `${selectedCityName}, ${stateName}, ${countryName}`
      })

      if (!geoData.lat || !geoData.lng) {
        setApiError(`"${selectedCityName}, ${stateName}" konumu bulunamadı.`)
        return
      }
      logs.push({ step: 'Geocode', query: `${selectedCityName}, ${stateName}`, resultCount: 1 })

      const { lat, lng } = geoData
      const placeMap = new Map<string, any>()
      const addPlaces = (places: any[]) =>
        places?.forEach(p => { if (p.place_id && !placeMap.has(p.place_id)) placeMap.set(p.place_id, p) })

      // Step 2: Search with escalating radius
      const radii = [2000, 5000, 15000, 30000]
      for (const r of radii) {
        setSearchProgress(`${selectedCityName} çevresinde aranıyor (${r / 1000}km)...`)
        const data = await callAPI({ action: 'search', lat, lng, radius: r, categories: selectedCategories })
        addPlaces(data.results || [])
        logs.push({ step: `Yarıçap ${r / 1000}km`, query: selectedCategories.join(', '), resultCount: data.results?.length || 0 })
        if (placeMap.size >= 15) break
      }

      // Step 3: Categorize results
      setSearchProgress('Sonuçlar sınıflandırılıyor...')
      const allPlaces = Array.from(placeMap.values())

      let scoredPlaces = allPlaces.map(place => {
        const matchedCats = selectedCategories.filter(cat => placeMatchesCategory(place, cat))
        return { ...place, matched_array: matchedCats, match_count: matchedCats.length }
      }).filter(p => p.match_count > 0)

      // Fallback: show all results if no category match (OSM data varies)
      if (scoredPlaces.length === 0 && allPlaces.length > 0) {
        scoredPlaces = allPlaces.map(p => ({ ...p, matched_array: selectedCategories, match_count: 1 }))
      }

      setTotalFound(scoredPlaces.length)

      const grouped: Record<number, any[]> = {}
      scoredPlaces.forEach(p => {
        if (!grouped[p.match_count]) grouped[p.match_count] = []
        grouped[p.match_count].push(p)
      })
      Object.values(grouped).forEach(arr => arr.sort((a, b) => (b.rating || 0) - (a.rating || 0)))

      setGroupedResults(grouped)
      setDiagnostics(logs)

      const levels = Object.keys(grouped).map(Number)
      const maxLevel = levels.length ? Math.max(...levels) : 0
      setExpandedGroups(Object.fromEntries(levels.map(k => [k, k === maxLevel])))

    } catch (err) {
      console.error('OSM Search error:', err)
      setApiError(String(err))
    } finally {
      setIsLoading(false)
      setSearchProgress('')
    }
  }

  const handleSelectBusiness = async (place: any) => {
    const existing = businesses.find(b => b.place_id === place.place_id)
    if (existing) { setActiveBusinessId(existing.id); onClose(); return }

    try {
      const res = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: place.name,
          location: place.formatted_address || 'Bilinmiyor',
          place_id: place.place_id,
          business_type: (place.matched_array || selectedCategories).join(', '),
          maps_rating: place.rating || null,
          maps_review_count: place.user_ratings_total || null,
        })
      })
      const data = await res.json()
      if (data.business) {
        await refreshBusinesses()
        setActiveBusinessId(data.business.id)
        onClose()
      }
    } catch (error) {
      console.error('Failed to select/create business', error)
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
            {step === 1 && 'Adım 1: Lokasyon Seçimi'}
            {step === 2 && 'Adım 2: Kategori Seçimi'}
            {step === 3 && 'Adım 3: İşletmenizi Bulun'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
        </div>

        {/* Progress Bar */}
        <div style={{ display: 'flex', gap: '5px', marginBottom: '20px' }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ height: '4px', flex: 1, borderRadius: '2px', background: s <= step ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)' }} />
          ))}
        </div>

        {/* OSM Badge */}
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '20px', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
            🌍 OpenStreetMap — API key gerekmez
          </span>
        </div>

        {/* ════════ Step 1: Location ════════ */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label className="form-label">Ülke</label>
              <select className="input-field" value={selectedCountryCode} onChange={e => { setSelectedCountryCode(e.target.value); setSelectedStateCode(''); setSelectedCityName('') }}>
                <option value="">Ülke Seçiniz</option>
                {countries.map(c => <option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">İl</label>
              <select className="input-field" value={selectedStateCode} onChange={e => { setSelectedStateCode(e.target.value); setSelectedCityName('') }} disabled={!selectedCountryCode}>
                <option value="">İl Seçiniz</option>
                {states.map(s => <option key={s.isoCode} value={s.isoCode}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">İlçe</label>
              <select className="input-field" value={selectedCityName} onChange={e => setSelectedCityName(e.target.value)} disabled={!selectedStateCode}>
                <option value="">İlçe Seçiniz</option>
                {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
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
                    background: isSelected ? 'rgba(79,70,229,0.15)' : 'rgba(255,255,255,0.02)',
                    color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                    transition: 'all 0.2s ease'
                  }}>
                    {cat}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(1)}><span>&larr;</span> Geri</button>
              <button className="btn btn-primary" style={{ flex: 2 }} disabled={!isStep2Valid} onClick={handleSearch}>
                🔍 OpenStreetMap'te Ara <span>&rarr;</span>
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
                <span style={{ fontSize: '0.8rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
                  ✅ {totalFound} işletme bulundu
                </span>
              )}
            </div>

            <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '5px' }}>

              {/* Loading */}
              {isLoading && (
                <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div className="loading-spinner" style={{ margin: '0 auto 15px' }} />
                  <p style={{ margin: 0, fontWeight: 500 }}>{searchProgress}</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '8px', opacity: 0.6 }}>OpenStreetMap üzerinden taranıyor...</p>
                </div>
              )}

              {/* Results */}
              {!isLoading && matchGroupsDesc.map(level => {
                const items = groupedResults[level]
                const isMax = level === selectedCategories.length
                const label = isMax
                  ? `🏆 Tam Eşleşme (${level}/${selectedCategories.length} kategori)`
                  : level > 1 ? `📌 ${level} Kategori Eşleşmesi` : '📋 Tekil Kategori'
                return (
                  <div key={level} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div onClick={() => toggleGroup(level)} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 12px', background: isMax ? 'rgba(79,70,229,0.08)' : 'rgba(255,255,255,0.04)',
                      borderRadius: '8px', cursor: 'pointer',
                      borderLeft: isMax ? '4px solid var(--accent-primary)' : '4px solid rgba(255,255,255,0.15)'
                    }}>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', color: isMax ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{label}</h4>
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
                                {place.maps_url && (
                                  <a href={place.maps_url} target="_blank" rel="noopener noreferrer"
                                    style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
                                    🗺️ Harita
                                  </a>
                                )}
                              </div>
                            </div>
                            {place.formatted_address && (
                              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{place.formatted_address}</p>
                            )}
                            {place.phone && (
                              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>📞 {place.phone}</p>
                            )}
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

              {/* No results */}
              {!isLoading && searchInitiated && totalFound === 0 && (
                <div style={{ padding: '20px', borderRadius: '8px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <h4 style={{ margin: '0 0 12px', color: '#ef4444', fontSize: '1rem' }}>⚠️ Sonuç Bulunamadı</h4>
                  {apiError && (
                    <div style={{ padding: '10px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px', marginBottom: '12px' }}>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{apiError}</p>
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', maxHeight: '180px', overflowY: 'auto' }}>
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
                            <td style={{ padding: '4px 8px', color: d.resultCount > 0 ? '#10b981' : '#ef4444' }}>{d.resultCount} sonuç</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    💡 OpenStreetMap verisi bölgeye göre değişebilir. İşletmenizi listede bulamazsanız manuel olarak ekleyebilirsiniz.
                  </p>
                </div>
              )}
            </div>

            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setStep(2)}>
              <span>&larr;</span> Kategori Seçimine Dön
            </button>
          </div>
        )}

      </div>
      <style jsx>{`
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
          display: flex; justify-content: center; align-items: center; z-index: 9999;
        }
        .modal-content {
          background: #121214; border: 1px solid var(--border-color);
          border-radius: var(--radius-lg); padding: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
          max-height: 90vh; overflow-y: auto;
        }
        .loading-spinner {
          width: 30px; height: 30px;
          border: 3px solid rgba(255,255,255,0.1);
          border-radius: 50%; border-top-color: var(--accent-primary);
          animation: spin 1s infinite linear;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
