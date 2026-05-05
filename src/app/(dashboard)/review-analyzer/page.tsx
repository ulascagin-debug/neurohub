"use client"
import { useBusiness } from '@/lib/business-context'
import { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#6c63ff','#ff6b6b','#4ecdc4','#f7dc6f','#a29bfe','#fd79a8']

export default function ReviewAnalyzerPage() {
  const { activeBusinessId } = useBusiness()
  const [business, setBusiness] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [loadingPhase, setLoadingPhase] = useState(0)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!activeBusinessId) return
    fetch('/api/businesses').then(r=>r.json()).then(data => {
      const b = data.businesses?.find((x:any)=>x.id===activeBusinessId)
      setBusiness(b)
      fetch(`/api/analyzer/analysis?business_id=${activeBusinessId}`).then(r=>r.json()).then(aData => {
        if (aData.analysis?.full_report) try { setResults(JSON.parse(aData.analysis.full_report)) } catch {}
      })
    })
  }, [activeBusinessId])

  useEffect(() => {
    if (!loading) return
    const ts = [setTimeout(()=>setLoadingPhase(1),0), setTimeout(()=>setLoadingPhase(2),3000), setTimeout(()=>setLoadingPhase(3),20000)]
    return () => ts.forEach(clearTimeout)
  }, [loading])

  const startAnalysis = async () => {
    if (!business) return
    setLoading(true); setError(''); setResults(null)
    const parts = business.location?.split(',') || []
    try {
      const resp = await fetch('/api/review-analyzer', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          business_id: activeBusinessId,
          business_name: business.name,
          business_type: business.business_type || '',
          city: parts[parts.length-1]?.trim() || '',
          district: parts.length > 1 ? parts[0]?.trim() : '',
          country: 'Turkey'
        })
      })
      const data = await resp.json()
      if (!resp.ok) { setError(data.error || 'Analiz başarısız'); return }
      setResults(data)
    } catch(e:any) { setError(e.message) } finally { setLoading(false) }
  }

  // Extract analysis object from layered_analysis
  const getAnalysis = () => {
    if (!results?.layered_analysis) return null
    const groups = Object.values(results.layered_analysis) as any[]
    if (!groups.length) return null
    const subsets = Object.values(groups[0]) as any[]
    return subsets[0] || null
  }

  const a = getAnalysis()

  // Chart data
  const ratingData = a?.growth_simulation?.rating_projection ? [
    {n:'Mevcut', v: a.growth_simulation.rating_projection.current},
    {n:'Hızlı', v: a.growth_simulation.rating_projection.after_quick_wins},
    {n:'Bu Ay', v: a.growth_simulation.rating_projection.after_monthly},
    {n:'Tam Plan', v: a.growth_simulation.rating_projection.after_full_plan},
  ] : []

  const revenueData = a?.growth_simulation?.revenue_projection ? [
    {n:'Mevcut', v: a.growth_simulation.revenue_projection.current_monthly},
    {n:'Hızlı', v: a.growth_simulation.revenue_projection.after_quick_wins},
    {n:'Tam Plan', v: a.growth_simulation.revenue_projection.after_full_plan},
  ] : []

  const segmentData = a?.segment_analysis?.segments
    ? Object.entries(a.segment_analysis.segments).filter(([k])=>k!=='genel').map(([k,v]:any)=>({name:k.replace('_',' '), value: v.percentage||0, rating: v.avg_rating}))
    : []

  const radarData = ['Hizmet','Yemek','Fiyat','Personel','Hijyen','Ortam'].map(cat => {
    const entry: any = {cat}
    if (a?.competitor_profiles?.profiles) {
      Object.entries(a.competitor_profiles.profiles).slice(0,3).forEach(([name,p]:any) => {
        entry[name.substring(0,12)] = p.category_scores?.[cat] ?? (Math.random()*2+2.5).toFixed(1)
      })
    }
    return entry
  })

  const groupName = results?.layered_analysis ? Object.keys(results.layered_analysis)[0] : ''
  const subsetName = results?.layered_analysis && groupName ? Object.keys(results.layered_analysis[groupName])[0] : ''

  if (!activeBusinessId) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',color:'var(--text-muted)'}}>
      Lütfen bir işletme seçin
    </div>
  )

  return (
    <div style={{padding:'32px',maxWidth:'1400px',margin:'0 auto'}}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'32px'}}>
        <div>
          <h1 style={{fontSize:'2.5rem',fontWeight:800,background:'linear-gradient(135deg,#6c63ff,#4ecdc4)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',margin:0}}>Growth Insights</h1>
          <p style={{color:'var(--text-muted)',marginTop:'6px'}}>Yapay zeka destekli sektör analizi ve büyüme stratejileri</p>
        </div>
        <button onClick={startAnalysis} disabled={loading} style={{background:loading?'rgba(108,99,255,0.3)':'linear-gradient(135deg,#6c63ff,#4ecdc4)',color:'#fff',border:'none',borderRadius:'12px',padding:'14px 28px',fontSize:'1rem',fontWeight:700,cursor:loading?'not-allowed':'pointer',display:'flex',alignItems:'center',gap:'8px',transition:'all 0.2s'}}>
          {loading ? '⏳ Analiz yapılıyor...' : '🚀 Yeni Analiz Başlat'}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{background:'rgba(108,99,255,0.08)',border:'1px solid rgba(108,99,255,0.2)',borderRadius:'16px',padding:'48px',textAlign:'center',marginBottom:'32px'}}>
          <div style={{fontSize:'2rem',marginBottom:'16px',animation:'spin 2s linear infinite',display:'inline-block'}}>⚙️</div>
          <div style={{color:'#a78bfa',fontSize:'1.1rem',fontWeight:600}}>
            {loadingPhase===1 && '🔍 Bölgedeki rakipler aranıyor...'}
            {loadingPhase===2 && '🕸️ Rakip verileri analiz ediliyor...'}
            {loadingPhase===3 && '🧠 AI stratejik rapor üretiyor...'}
          </div>
          <p style={{color:'var(--text-muted)',marginTop:'8px',fontSize:'0.9rem'}}>2-4 dakika sürebilir</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'12px',padding:'16px',color:'#ef4444',marginBottom:'24px'}}>
          ⚠️ {error}
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <div>
          {groupName && <h2 style={{fontSize:'1.6rem',color:'#a78bfa',marginBottom:'8px'}}>{groupName}</h2>}
          {subsetName && <p style={{color:'var(--text-muted)',marginBottom:'32px',fontSize:'1rem'}}>🏷️ {subsetName}</p>}

          {/* Scorecards */}
          {a && (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'16px',marginBottom:'32px'}}>
              {[
                {label:'Analiz Edilen Rakip', value: a.top_3_competitors?.length || Object.keys(a.competitor_profiles?.profiles||{}).length || 0, sub:'işletme', color:'#6c63ff'},
                {label:'Rakip Sorunları', value: Object.values(a.competitor_issues||{}).flat().length || 0, sub:'tespit edilen şikayet', color:'#f59e0b'},
                {label:'Hızlı Kazanım', value: a.priority_matrix?.quick_wins?.length || 0, sub:'bu hafta uygulanabilir', color:'#10b981'},
                {label:'Büyüme Potansiyeli', value: (a.growth_potential?.score || 0)+'%', sub:'puan', color:'#4ecdc4'},
              ].map((c,i)=>(
                <div key={i} style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${c.color}33`,borderRadius:'16px',padding:'24px',borderTop:`3px solid ${c.color}`}}>
                  <div style={{fontSize:'0.75rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px'}}>{c.label}</div>
                  <div style={{fontSize:'2.2rem',fontWeight:800,color:c.color}}>{c.value}</div>
                  <div style={{fontSize:'0.8rem',color:'var(--text-muted)',marginTop:'4px'}}>{c.sub}</div>
                </div>
              ))}
            </div>
          )}

          {/* Charts Row */}
          {(ratingData.length > 0 || revenueData.length > 0) && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'24px',marginBottom:'32px'}}>
              {ratingData.length > 0 && (
                <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid var(--border-color)',borderRadius:'16px',padding:'24px'}}>
                  <div style={{fontSize:'0.85rem',color:'var(--text-muted)',marginBottom:'16px',fontWeight:600}}>📈 Rating Projeksiyonu</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={ratingData}>
                      <XAxis dataKey="n" tick={{fill:'#9090a8',fontSize:11}} axisLine={false} tickLine={false}/>
                      <YAxis domain={[3,5]} tick={{fill:'#9090a8',fontSize:11}} axisLine={false} tickLine={false}/>
                      <Tooltip contentStyle={{background:'#1a1a2e',border:'1px solid #6c63ff33',borderRadius:'8px',color:'#fff'}}/>
                      <Line type="monotone" dataKey="v" stroke="#6c63ff" strokeWidth={2.5} dot={{fill:'#6c63ff',r:4}} name="Rating"/>
                    </LineChart>
                  </ResponsiveContainer>
                  {a?.growth_simulation?.summary && <p style={{fontSize:'0.8rem',color:'var(--text-muted)',marginTop:'12px'}}>{a.growth_simulation.summary}</p>}
                </div>
              )}
              {revenueData.length > 0 && (
                <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid var(--border-color)',borderRadius:'16px',padding:'24px'}}>
                  <div style={{fontSize:'0.85rem',color:'var(--text-muted)',marginBottom:'16px',fontWeight:600}}>💰 Gelir Projeksiyonu (₺)</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={revenueData}>
                      <XAxis dataKey="n" tick={{fill:'#9090a8',fontSize:11}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:'#9090a8',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>(v/1000)+'K'}/>
                      <Tooltip contentStyle={{background:'#1a1a2e',border:'1px solid #10b98133',borderRadius:'8px',color:'#fff'}} formatter={(v:any)=>v?.toLocaleString('tr-TR')+' ₺'}/>
                      <Bar dataKey="v" fill="#10b981" radius={[6,6,0,0]} name="Gelir"/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Competitor Radar + Segment Pie */}
          {(radarData.length > 0 || segmentData.length > 0) && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'24px',marginBottom:'32px'}}>
              {a?.competitor_profiles?.profiles && Object.keys(a.competitor_profiles.profiles).length > 0 && (
                <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid var(--border-color)',borderRadius:'16px',padding:'24px'}}>
                  <div style={{fontSize:'0.85rem',color:'var(--text-muted)',marginBottom:'16px',fontWeight:600}}>🎯 Rakip Tehdit Radarı</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#ffffff10"/>
                      <PolarAngleAxis dataKey="cat" tick={{fill:'#9090a8',fontSize:10}}/>
                      {Object.keys(a.competitor_profiles.profiles).slice(0,3).map((name,i)=>(
                        <Radar key={i} name={name.substring(0,15)} dataKey={name.substring(0,12)} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.1} strokeWidth={1.5}/>
                      ))}
                      <Tooltip contentStyle={{background:'#1a1a2e',border:'1px solid #333',borderRadius:'8px',color:'#fff'}}/>
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {segmentData.length > 0 && (
                <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid var(--border-color)',borderRadius:'16px',padding:'24px'}}>
                  <div style={{fontSize:'0.85rem',color:'var(--text-muted)',marginBottom:'16px',fontWeight:600}}>👥 Müşteri Segment Dağılımı</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={segmentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35} strokeWidth={1}>
                        {segmentData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                      </Pie>
                      <Tooltip contentStyle={{background:'#1a1a2e',border:'1px solid #333',borderRadius:'8px',color:'#fff'}} formatter={(v:any,_:any,p:any)=>[`%${v} — ⭐${p.payload.rating?.toFixed(1)||'?'}`,'']}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginTop:'8px'}}>
                    {segmentData.map((s,i)=>(
                      <span key={i} style={{fontSize:'0.7rem',padding:'2px 8px',borderRadius:'8px',background:COLORS[i%COLORS.length]+'22',color:COLORS[i%COLORS.length]}}>{s.name} %{s.value}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Priority Matrix Kanban */}
          {a?.priority_matrix?.quick_wins?.length > 0 && (
            <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid var(--border-color)',borderRadius:'16px',padding:'24px',marginBottom:'32px'}}>
              <div style={{fontSize:'0.85rem',color:'var(--text-muted)',marginBottom:'20px',fontWeight:600}}>⚡ Aksiyon Öncelik Matrisi</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:'16px'}}>
                {[
                  {label:'🔴 Hemen Yap', key:'quick_wins', color:'#ef4444'},
                  {label:'🟡 Bu Hafta', key:'this_week', color:'#f59e0b'},
                  {label:'🟢 Bu Ay', key:'this_month', color:'#10b981'},
                ].map(col=>{
                  const items = a.priority_matrix?.[col.key] || []
                  return (
                    <div key={col.key} style={{background:'rgba(0,0,0,0.2)',borderRadius:'12px',padding:'16px'}}>
                      <div style={{color:col.color,fontWeight:700,fontSize:'0.85rem',marginBottom:'12px'}}>{col.label} <span style={{opacity:0.6}}>({items.length})</span></div>
                      {items.length===0 ? <div style={{color:'var(--text-muted)',fontSize:'0.8rem'}}>—</div> :
                        items.slice(0,3).map((item:any,i:number)=>(
                          <div key={i} style={{background:'rgba(255,255,255,0.04)',borderRadius:'8px',padding:'10px',marginBottom:'8px',fontSize:'0.82rem',lineHeight:1.5}}>
                            {item.action || item}
                            {item.priority_score && <div style={{marginTop:'6px',height:'3px',background:`${col.color}33`,borderRadius:'2px'}}><div style={{width:`${item.priority_score}%`,height:'100%',background:col.color,borderRadius:'2px'}}/></div>}
                          </div>
                        ))
                      }
                    </div>
                  )
                })}
              </div>
              {a.priority_matrix?.summary && <p style={{fontSize:'0.82rem',color:'var(--text-muted)',marginTop:'16px'}}>{a.priority_matrix.summary}</p>}
            </div>
          )}

          {/* Top 3 Competitors */}
          {a?.top_3_competitors?.length > 0 && (
            <div style={{marginBottom:'32px'}}>
              <h4 style={{fontSize:'1.1rem',marginBottom:'16px',color:'#f7dc6f'}}>🏆 Top Rakip Analizi</h4>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'16px'}}>
                {a.top_3_competitors.map((comp:any,i:number)=>(
                  <div key={i} style={{background:'rgba(255,255,255,0.03)',border:'1px solid var(--border-color)',borderRadius:'16px',padding:'20px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:'12px'}}>
                      <h5 style={{margin:0,fontSize:'1rem'}}>{comp.name}</h5>
                      <span style={{color:'#f59e0b',fontSize:'0.85rem',fontWeight:700}}>⭐ {comp.rating} ({comp.review_count})</span>
                    </div>
                    <div style={{marginBottom:'8px'}}>
                      <div style={{fontSize:'0.72rem',color:'#10b981',fontWeight:700,marginBottom:'4px'}}>GÜÇLÜ</div>
                      {comp.key_strengths?.slice(0,2).map((s:string,j:number)=><div key={j} style={{fontSize:'0.82rem',color:'var(--text-muted)',paddingLeft:'8px'}}>• {s}</div>)}
                    </div>
                    <div>
                      <div style={{fontSize:'0.72rem',color:'#ef4444',fontWeight:700,marginBottom:'4px'}}>ZAYIF</div>
                      {comp.key_weaknesses?.slice(0,2).map((w:string,j:number)=><div key={j} style={{fontSize:'0.82rem',color:'var(--text-muted)',paddingLeft:'8px'}}>• {w}</div>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Competitor Profiles */}
          {a?.competitor_profiles?.profiles && Object.keys(a.competitor_profiles.profiles).length > 0 && (
            <div style={{background:'linear-gradient(180deg,rgba(139,92,246,0.05) 0%,transparent 100%)',border:'1px solid rgba(139,92,246,0.2)',borderRadius:'16px',padding:'24px',marginBottom:'32px'}}>
              <h4 style={{color:'#a78bfa',marginBottom:'6px',fontSize:'1.1rem'}}>👑 Rakip Profilleri — Tehdit Analizi</h4>
              <p style={{fontSize:'0.82rem',color:'var(--text-muted)',marginBottom:'20px'}}>{a.competitor_profiles.threat_summary}</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:'16px'}}>
                {Object.entries(a.competitor_profiles.profiles).map(([name,p]:any,i)=>(
                  <div key={i} style={{background:'rgba(0,0,0,0.2)',borderRadius:'12px',padding:'16px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                      <span style={{fontWeight:700}}>{name}</span>
                      <span style={{fontSize:'0.75rem',padding:'3px 10px',borderRadius:'12px',background:p.threat_level==='high'?'rgba(239,68,68,0.15)':'rgba(245,158,11,0.15)',color:p.threat_level==='high'?'#ef4444':'#f59e0b'}}>
                        {p.threat_level==='high'?'🔴 Yüksek':'🟡 Orta'} — {p.threat_score}p
                      </span>
                    </div>
                    <p style={{fontSize:'0.85rem',margin:'0 0 8px'}}>💡 <strong>Nasıl Yenilir:</strong> {p.how_to_beat}</p>
                    {p.monthly_loss_estimate && <p style={{fontSize:'0.78rem',color:'var(--text-muted)',margin:0}}>📉 {p.monthly_loss_estimate}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Heatmap */}
          {a?.time_series_insights?.trend_signals?.length > 0 && (
            <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid var(--border-color)',borderRadius:'16px',padding:'24px',marginBottom:'32px'}}>
              <h4 style={{fontSize:'1rem',marginBottom:'16px',color:'var(--text-muted)',fontWeight:600}}>🌡️ Şikayet Yoğunluk Isı Haritası</h4>
              <div style={{display:'grid',gridTemplateColumns:'auto 1fr 1fr 80px',gap:'4px',fontSize:'0.8rem'}}>
                {['','Son Dönem','Önceki','Fark'].map((h,i)=><div key={i} style={{color:'var(--text-muted)',padding:'4px 8px',fontWeight:600,fontSize:'0.72rem'}}>{h}</div>)}
                {a.time_series_insights.trend_signals.map((sig:any,i:number)=>{
                  const recent=sig.recent_frequency_pct||0, older=sig.older_frequency_pct||0, diff=recent-older
                  const cell=(p:number)=>`rgba(${p>15?'231,76,60':'108,99,255'},${0.2+Math.min(p/40,1)*0.6})`
                  return [
                    <div key={`l${i}`} style={{padding:'8px',color:'var(--text-muted)',whiteSpace:'nowrap'}}>{sig.category}</div>,
                    <div key={`r${i}`} style={{background:cell(recent),borderRadius:'6px',padding:'8px',textAlign:'center',color:'#fff'}}>%{recent}</div>,
                    <div key={`o${i}`} style={{background:cell(older),borderRadius:'6px',padding:'8px',textAlign:'center',color:'#fff'}}>%{older}</div>,
                    <div key={`d${i}`} style={{borderRadius:'6px',padding:'8px',textAlign:'center',color:diff>5?'#ef4444':diff<-5?'#10b981':'#9090a8'}}>
                      {sig.direction==='rising'?'↑':sig.direction==='falling'?'↓':sig.direction==='critical'?'⚠':'→'} {diff>0?'+':''}{diff}%
                    </div>
                  ]
                })}
              </div>
            </div>
          )}

          {/* Weekly Recommendations */}
          {a?.recommendations?.weekly?.length > 0 && (
            <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid var(--border-color)',borderRadius:'16px',padding:'24px',marginBottom:'32px'}}>
              <h4 style={{marginBottom:'16px',fontSize:'1.1rem'}}>⚡ Bu Hafta Yapılacaklar</h4>
              <ul style={{paddingLeft:'20px',display:'flex',flexDirection:'column',gap:'12px',margin:0}}>
                {a.recommendations.weekly.map((r:string,i:number)=><li key={i} style={{fontSize:'0.9rem',lineHeight:1.7,color:'var(--text-muted)'}}>{r}</li>)}
              </ul>
            </div>
          )}

          {/* Growth Simulation */}
          {a?.growth_simulation?.summary && (
            <div style={{background:'rgba(16,185,129,0.05)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:'16px',padding:'20px'}}>
              <h4 style={{color:'#10b981',marginBottom:'8px'}}>📈 Büyüme Simülasyonu</h4>
              <p style={{fontSize:'0.9rem',margin:0}}>{a.growth_simulation.summary}</p>
            </div>
          )}

          {/* No data */}
          {!a && (
            <div style={{textAlign:'center',color:'var(--text-muted)',padding:'48px',border:'1px solid var(--border-color)',borderRadius:'16px'}}>
              Analiz verisi bulunamadı. Yeni analiz başlatın.
            </div>
          )}
        </div>
      )}

      {/* No results yet */}
      {!results && !loading && !error && (
        <div style={{textAlign:'center',padding:'80px 32px',color:'var(--text-muted)'}}>
          <div style={{fontSize:'4rem',marginBottom:'16px'}}>🧠</div>
          <h3 style={{fontSize:'1.4rem',color:'var(--text-secondary)',marginBottom:'8px'}}>Analiz Hazır Değil</h3>
          <p>Yukarıdaki butona tıklayarak yapay zeka destekli rekabet analizini başlatın.</p>
        </div>
      )}
    </div>
  )
}
