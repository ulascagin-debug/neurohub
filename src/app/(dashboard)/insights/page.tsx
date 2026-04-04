"use client"

import { useBusiness } from '@/lib/business-context'
import { useState, useEffect } from 'react'
import { searchBusiness, analyzeCompetitors, PlaceSearchResult, AnalyzeResponse } from '@/lib/review-analyzer'

type Step = 'select' | 'loading' | 'results' | 'error'

const LOADING_MESSAGES = [
  "Rakip işletmeler taranıyor...",
  "Yorumlar analiz ediliyor...",
  "Rapor hazırlanıyor..."
];

export default function InsightsPage() {
  const { activeBusinessId, activeBusiness } = useBusiness()
  
  const [step, setStep] = useState<Step>('select')
  const [errorMsg, setErrorMsg] = useState('')
  
  // Selection State
  const [isManualMode, setIsManualMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLocation, setSearchLocation] = useState('')
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([])
  const [selectedPlace, setSelectedPlace] = useState<PlaceSearchResult | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  
  // Manual Entry State
  const [manualName, setManualName] = useState('')
  const [manualAddress, setManualAddress] = useState('')
  const [manualType, setManualType] = useState('Diğer')
  
  // Loading State
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0)
  
  // Results State
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null)
  const [timelineTab, setTimelineTab] = useState<'1_week' | '1_month' | '1_year'>('1_week')

  useEffect(() => {
    if (activeBusiness) {
      setSearchQuery(activeBusiness.name || '')
      const parts = (activeBusiness.location || '').split(',')
      setSearchLocation(parts[0]?.trim() || 'İstanbul')
    }
  }, [activeBusiness])

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'loading') {
      setLoadingMsgIdx(0);
      interval = setInterval(() => {
        setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [step]);

  const handleSearch = async () => {
    if (!searchQuery) return
    setHasSearched(true)
    try {
      setSearchResults([])
      const results = await searchBusiness(searchQuery, searchLocation)
      setSearchResults(results)
    } catch (err: any) {
      alert(err.message || 'Arama yapılamadı.')
    }
  }

  const handleStartAnalysis = async () => {
    setStep('loading')
    setErrorMsg('')
    
    try {
      let payload
      if (isManualMode) {
        payload = {
          business_id: activeBusinessId || undefined,
          name: manualName,
          address: manualAddress,
          business_type: manualType,
          found_on_maps: false
        }
      } else {
        if (!selectedPlace) {
           throw new Error("Lütfen bir işletme seçin")
        }
        payload = {
          business_id: activeBusinessId || undefined,
          place_id: selectedPlace.place_id,
          name: selectedPlace.name,
          address: selectedPlace.address,
          found_on_maps: true
        }
      }

      // We wrap fetch in a larger timeout using an AbortController if possible, or just rely on fetch
      const result = await analyzeCompetitors(payload)
      setAnalysisResult(result)
      setStep('results')
    } catch (err: any) {
      setErrorMsg(err.message || 'Analiz sırasında bir hata oluştu.')
      setStep('error')
    }
  }

  const renderSelectStep = () => (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8 text-gradient">İşletmenizi Seçin</h1>
      
      <div className="glass-panel p-8 mb-6">
        <div className="flex gap-4 mb-6">
          <button 
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${!isManualMode ? 'bg-primary/20 text-primary border border-primary/50' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
            onClick={() => setIsManualMode(false)}
          >
             Google Maps'te Ara
          </button>
          <button 
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${isManualMode ? 'bg-primary/20 text-primary border border-primary/50' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
            onClick={() => setIsManualMode(true)}
          >
             İşletmem Google Maps'te Yok
          </button>
        </div>

        {!isManualMode ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">İşletme Adı</label>
                <input 
                  type="text" 
                  className="input-field w-full" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Örn: Burger King"
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Konum (Şehir/İlçe)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="input-field w-full" 
                    value={searchLocation} 
                    onChange={e => setSearchLocation(e.target.value)}
                    placeholder="Örn: Kadıköy"
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  />
                  <button className="btn-primary px-6" onClick={handleSearch}>Ara</button>
                </div>
              </div>
            </div>

            {searchResults.length > 0 && (
              <div className="mt-6 border border-white/10 rounded-xl overflow-hidden bg-black/20">
                <div className="max-h-60 overflow-y-auto p-2 space-y-2">
                  {searchResults.map((place, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-lg cursor-pointer flex justify-between items-center transition-colors ${selectedPlace?.place_id === place.place_id ? 'bg-primary/20 border border-primary/30' : 'hover:bg-white/5 border border-transparent'}`}
                      onClick={() => setSelectedPlace(place)}
                    >
                      <div>
                        <div className="font-semibold">{place.name}</div>
                        <div className="text-xs text-gray-400">{place.address}</div>
                      </div>
                      {place.rating && (
                        <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded text-sm">
                          ⭐ {place.rating} <span className="text-gray-400 text-xs">({place.user_ratings_total})</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasSearched && searchResults.length === 0 && (
              <div className="mt-6 p-4 text-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                Bu bölgede işletme bulunamadı veya aramaya uygun sonuç çıkmadı.
              </div>
            )}
            
            <div className="pt-4 flex justify-end">
              <button 
                className="btn-primary w-full md:w-auto" 
                onClick={handleStartAnalysis}
                disabled={!selectedPlace}
              >
                Analizi Başlat
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">İşletme Adı</label>
              <input 
                type="text" 
                className="input-field w-full" 
                value={manualName} 
                onChange={e => setManualName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Açık Adres</label>
              <input 
                type="text" 
                className="input-field w-full" 
                value={manualAddress} 
                onChange={e => setManualAddress(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">İşletme Türü</label>
              <select 
                className="input-field w-full appearance-none bg-dark-bg/50" 
                value={manualType} 
                onChange={e => setManualType(e.target.value)}
              >
                {['Berber', 'Diş Hekimi', 'Güzellik Salonu', 'Dövme Stüdyosu', 'Tırnak Bakım', 'Kafe', 'Restoran', 'Diğer'].map(t => (
                  <option key={t} value={t} className="bg-gray-900">{t}</option>
                ))}
              </select>
            </div>
            <div className="pt-4 flex justify-end">
              <button 
                className="btn-primary w-full md:w-auto" 
                onClick={handleStartAnalysis}
                disabled={!manualName || !manualAddress}
              >
                Analizi Başlat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const renderLoadingStep = () => (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
      </div>
      <h2 className="text-2xl font-semibold text-white animate-pulse">
        {LOADING_MESSAGES[loadingMsgIdx]}
      </h2>
      <p className="mt-4 text-gray-400 max-w-sm text-center">
        Analiz uzun sürebilir, lütfen bekleyin. Veriler toplanıp AI modelinden geçiriliyor...
      </p>
    </div>
  )

  const renderErrorStep = () => (
    <div className="max-w-2xl mx-auto text-center mt-20">
       <div className="text-6xl mb-4">⚠️</div>
       <h2 className="text-2xl font-bold text-red-400 mb-4">Hata Oluştu</h2>
       <p className="text-gray-300 mb-8">{errorMsg}</p>
       <button className="btn-primary" onClick={() => setStep('select')}>
         Geri Dön ve Tekrar Dene
       </button>
    </div>
  )

  const renderResultsStep = () => {
    if (!analysisResult) return null

    // Extract structured data if available, else fallback
    const { data: rd } = analysisResult
    const greenList = rd?.comparison?.green || []
    const redList = rd?.comparison?.red || []
    const yellowList = rd?.comparison?.yellow || []
    const wk1 = typeof analysisResult.time_1_week === 'string' 
      ? analysisResult.time_1_week.split('\n').filter(l => l.trim().startsWith('-'))
      : rd?.timeline?.['1_week'] || []
    const mo1 = typeof analysisResult.time_1_month === 'string'
      ? analysisResult.time_1_month.split('\n').filter(l => l.trim().startsWith('-'))
      : rd?.timeline?.['1_month'] || []
    const yr1 = typeof analysisResult.time_1_year === 'string'
      ? analysisResult.time_1_year.split('\n').filter(l => l.trim().startsWith('-'))
      : rd?.timeline?.['1_year'] || []

    const compList = rd?.competitors || []
    const growthScore = rd?.growth_potential?.score || Math.max(10, Math.min(100, (analysisResult.competitor_weakness_count || 1) * 15))
    const growthSummary = rd?.growth_potential?.summary || "Rakiplerinizin zayıf yönlerini avantaja çevirerek büyüme oranınızı belirgin şekilde artırabilirsiniz."

    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500 pb-16">
        
        <div className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-white/5">
           <div>
             <h1 className="text-2xl font-bold text-gradient">Analiz Raporu</h1>
             <p className="text-gray-400 text-sm">{analysisResult.updated_at ? new Date(analysisResult.updated_at).toLocaleString() : 'Güncel'}</p>
           </div>
           <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm font-semibold" onClick={() => setStep('select')}>
             Yeni Analiz
           </button>
        </div>

        {/* Büyüme Potansiyeli */}
        <div className="glass-panel p-8 text-center bg-gradient-to-br from-primary/10 to-transparent border-t-2 border-primary">
          <h2 className="text-xl font-semibold mb-6">Büyüme Potansiyeli</h2>
          <div className="inline-block relative">
            <svg width="150" height="150" viewBox="0 0 100 100" className="transform -rotate-90">
               <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-800" />
               <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-primary transition-all duration-1000 ease-out"
                strokeDasharray={`${(growthScore/100)*251} 251`}
               />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-bold">{growthScore}%</span>
            </div>
          </div>
          <p className="text-gray-300 mt-6 max-w-2xl mx-auto leading-relaxed">{growthSummary}</p>
        </div>

        {/* Karşılaştırma */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Pazar Karşılaştırması</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel p-6 border-t-2 border-emerald-500 bg-emerald-500/5">
              <h3 className="font-semibold text-emerald-400 mb-4 flex items-center gap-2"><span>🟢</span> Güçlü Olduğun Alanlar</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                {greenList.length ? greenList.map((g, i) => <li key={i}>• {g}</li>) : <li>Veri yok</li>}
              </ul>
            </div>
            <div className="glass-panel p-6 border-t-2 border-amber-500 bg-amber-500/5">
              <h3 className="font-semibold text-amber-400 mb-4 flex items-center gap-2"><span>🟡</span> Benzer Performans</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                {yellowList.length ? yellowList.map((y, i) => <li key={i}>• {y}</li>) : <li>Veri yok</li>}
              </ul>
            </div>
            <div className="glass-panel p-6 border-t-2 border-rose-500 bg-rose-500/5">
              <h3 className="font-semibold text-rose-400 mb-4 flex items-center gap-2"><span>🔴</span> Geliştirmen Gerekenler</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                {redList.length ? redList.map((r, i) => <li key={i}>• {r}</li>) : <li>Veri yok</li>}
              </ul>
            </div>
          </div>
        </div>

        {/* İşletmen vs Rakipler */}
        {compList.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Rakiplerin Analizi</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {compList.map((comp, idx) => (
                <div key={idx} className="glass-panel p-5 hover:bg-white/5 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-white truncate pr-2">{comp.name}</h3>
                    {comp.rating && <div className="text-xs bg-white/10 px-2 py-1 rounded shrink-0">⭐ {comp.rating} ({comp.review_count || 0})</div>}
                  </div>
                  <div className="space-y-3 mt-4 text-xs">
                    <div>
                      <span className="text-emerald-400 font-semibold mb-1 block">Güçlü Yönleri (Avantaj)</span>
                      <ul className="text-gray-400 space-y-1">
                        {comp.strengths.slice(0, 2).map((s, i) => <li key={i}>+ {s}</li>)}
                      </ul>
                    </div>
                    <div>
                      <span className="text-rose-400 font-semibold mb-1 block">Zayıf Yönleri (Fırsat)</span>
                      <ul className="text-gray-400 space-y-1">
                        {comp.weaknesses.slice(0, 2).map((w, i) => <li key={i}>- {w}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tavsiyeler (Timeline Tabs) */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Zaman Çizelgeli Tavsiyeler</h2>
          <div className="glass-panel overflow-hidden">
            <div className="flex border-b border-white/10">
              <button 
                onClick={() => setTimelineTab('1_week')}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${timelineTab === '1_week' ? 'bg-primary/20 text-primary border-b-2 border-primary' : 'text-gray-400 hover:bg-white/5'}`}
              >
                 Bu Hafta
              </button>
              <button 
                onClick={() => setTimelineTab('1_month')}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${timelineTab === '1_month' ? 'bg-primary/20 text-primary border-b-2 border-primary' : 'text-gray-400 hover:bg-white/5'}`}
              >
                 Bu Ay
              </button>
              <button 
                onClick={() => setTimelineTab('1_year')}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${timelineTab === '1_year' ? 'bg-primary/20 text-primary border-b-2 border-primary' : 'text-gray-400 hover:bg-white/5'}`}
              >
                 Bu Yıl
              </button>
            </div>
            <div className="p-6 text-sm text-gray-300 leading-relaxed min-h-[150px]">
              {timelineTab === '1_week' && (wk1.length > 0 ? <ul className="space-y-3">{wk1.map((i: string, idx: number) => <li key={idx}>{i}</li>)}</ul> : 'Tavsiye bulunamadı.')}
              {timelineTab === '1_month' && (mo1.length > 0 ? <ul className="space-y-3">{mo1.map((i: string, idx: number) => <li key={idx}>{i}</li>)}</ul> : 'Tavsiye bulunamadı.')}
              {timelineTab === '1_year' && (yr1.length > 0 ? <ul className="space-y-3">{yr1.map((i: string, idx: number) => <li key={idx}>{i}</li>)}</ul> : 'Tavsiye bulunamadı.')}
            </div>
          </div>
        </div>

        {/* Fallback Legacy Flat Report (if old API is used) */}
        {!rd && analysisResult.full_report && (
          <div className="glass-panel p-6 opacity-70">
            <h2 className="text-xl font-semibold mb-4 text-warning">Ham Analiz Raporu</h2>
            <div className="whitespace-pre-wrap text-sm text-gray-400">{analysisResult.full_report}</div>
          </div>
        )}

      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      {step === 'select' && renderSelectStep()}
      {step === 'loading' && renderLoadingStep()}
      {step === 'error' && renderErrorStep()}
      {step === 'results' && renderResultsStep()}
    </div>
  )
}
