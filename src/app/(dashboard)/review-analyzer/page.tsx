"use client"

import { useState, useMemo } from 'react'

const BUSINESS_TYPES = [
  { value: 'berber', label: 'Berber' },
  { value: 'dis_hekimi', label: 'Diş Hekimi' },
  { value: 'kafe', label: 'Kafe' },
  { value: 'dovme', label: 'Dövme' },
  { value: 'tirnak_bakim', label: 'Tırnak Bakım' },
  { value: 'diger', label: 'Diğer' },
]

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
  recommendations: {
    week: string[]
    month: string[]
    year: string[]
  }
  growth_score: number
  growth_summary: string
  full_report?: string
}

export default function ReviewAnalyzerPage() {
  // Form state
  const [businessName, setBusinessName] = useState('')
  const [city, setCity] = useState('')
  const [businessType, setBusinessType] = useState('')

  // Result state
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<TabKey>('week')

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

      // Normalize the response into our AnalysisResult shape
      setResult(normalizeResult(data))
    } catch (err: any) {
      setError(err.message || 'Analiz servisi şu an kullanılamıyor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-gradient">Review Analyzer</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Google Yorumlarını analiz ederek rakiplerinize karşı konumunuzu keşfedin.
      </p>

      {/* ─── Form ─── */}
      <form onSubmit={handleSubmit}>
        <div className="glass-panel" style={{ padding: '28px', marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🏢</span> İşletme Bilgileri
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
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
                style={{ cursor: 'pointer' }}
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
            style={{ minWidth: '200px', fontSize: '0.95rem', padding: '12px 24px' }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <span className="spinner" /> Analiz Ediliyor...
              </span>
            ) : '🔍 Analiz Başlat'}
          </button>

          {error && (
            <div style={{
              marginTop: '16px',
              padding: '14px 18px',
              borderRadius: '10px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: 'var(--danger)',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span>⚠️</span> {error}
            </div>
          )}
        </div>
      </form>

      {/* ─── Loading State ─── */}
      {loading && (
        <div className="glass-panel" style={{ padding: '60px 40px', textAlign: 'center', marginBottom: '24px' }}>
          <div className="loading-pulse" style={{ fontSize: '3rem', marginBottom: '16px' }}>🔬</div>
          <h3 style={{ marginBottom: '8px' }}>Analiz Devam Ediyor...</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Google yorumları taranıyor ve rakip analizi yapılıyor. Bu işlem birkaç dakika sürebilir.
          </p>
          <div style={{ marginTop: '24px' }}>
            <div style={{
              width: '240px',
              height: '4px',
              borderRadius: '2px',
              background: 'rgba(255,255,255,0.06)',
              margin: '0 auto',
              overflow: 'hidden',
            }}>
              <div className="progress-slide" />
            </div>
          </div>
        </div>
      )}

      {/* ─── Results ─── */}
      {result && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeSlideIn 0.5s ease' }}>

          {/* Business vs Competitors */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚔️</span> İşletmen vs Rakipler
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {/* Target Business */}
              {result.target_business && (
                <BusinessCard
                  business={result.target_business}
                  isTarget
                />
              )}
              {/* Competitors */}
              {result.competitors.map((comp, i) => (
                <BusinessCard key={i} business={comp} />
              ))}
            </div>
          </div>

          {/* Strengths / Weaknesses / Equal */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <AreaCard
              title="Güçlü Alanlar"
              icon="💪"
              items={result.strengths}
              color="#10b981"
              bgColor="rgba(16,185,129,0.06)"
              borderColor="rgba(16,185,129,0.25)"
            />
            <AreaCard
              title="Zayıf Alanlar"
              icon="📉"
              items={result.weaknesses}
              color="#ef4444"
              bgColor="rgba(239,68,68,0.06)"
              borderColor="rgba(239,68,68,0.25)"
            />
            <AreaCard
              title="Eşit Alanlar"
              icon="⚖️"
              items={result.equal_areas}
              color="#f59e0b"
              bgColor="rgba(245,158,11,0.06)"
              borderColor="rgba(245,158,11,0.25)"
            />
          </div>

          {/* Recommendations Tabs */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>💡</span> Tavsiyeler
            </h3>

            {/* Tab buttons */}
            <div style={{
              display: 'flex',
              gap: '4px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              padding: '4px',
              marginBottom: '20px',
            }}>
              {[
                { key: 'week' as TabKey, label: 'Bu Hafta', icon: '⚡' },
                { key: 'month' as TabKey, label: 'Bu Ay', icon: '📅' },
                { key: 'year' as TabKey, label: 'Bu Yıl', icon: '🚀' },
              ].map(tab => {
                const isActive = activeTab === tab.key
                return (
                  <button
                    key={tab.key}
                    id={`tab-${tab.key}`}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      transition: 'all 0.25s ease',
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.15))'
                        : 'transparent',
                      color: isActive ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
                      boxShadow: isActive ? '0 2px 12px rgba(99,102,241,0.2)' : 'none',
                    }}
                  >
                    <span style={{ marginRight: '6px' }}>{tab.icon}</span>
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* Tab content */}
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              {(result.recommendations[activeTab] || []).length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {result.recommendations[activeTab].map((rec, i) => (
                    <li key={i} style={{
                      padding: '14px 18px',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.875rem',
                      lineHeight: 1.6,
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start',
                    }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        background: 'rgba(99,102,241,0.15)',
                        color: 'var(--accent-primary)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}>{i + 1}</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                  Bu zaman dilimi için tavsiye bulunamadı.
                </p>
              )}
            </div>
          </div>

          {/* Growth Potential */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📈</span> Büyüme Potansiyeli
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '20px' }}>
              {/* Gauge */}
              <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
                <svg viewBox="0 0 120 120" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  <circle
                    cx="60" cy="60" r="50"
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="10"
                  />
                  <circle
                    cx="60" cy="60" r="50"
                    fill="none"
                    stroke={getScoreColor(result.growth_score)}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(result.growth_score / 100) * 314} 314`}
                    style={{ transition: 'stroke-dasharray 1s ease' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: getScoreColor(result.growth_score) }}>
                    {result.growth_score}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>/ 100</div>
                </div>
              </div>

              {/* Progress bar alternative */}
              <div style={{ flex: 1 }}>
                <div style={{
                  height: '8px',
                  borderRadius: '4px',
                  background: 'rgba(255,255,255,0.06)',
                  overflow: 'hidden',
                  marginBottom: '12px',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${result.growth_score}%`,
                    borderRadius: '4px',
                    background: `linear-gradient(90deg, ${getScoreColor(result.growth_score)}, ${getScoreColorEnd(result.growth_score)})`,
                    transition: 'width 1s ease',
                  }} />
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                  {result.growth_summary || getDefaultGrowthText(result.growth_score)}
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .loading-pulse {
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        .progress-slide {
          width: 40%;
          height: 100%;
          border-radius: 2px;
          background: linear-gradient(90deg, var(--accent-primary), #a78bfa);
          animation: slide 1.5s ease-in-out infinite;
        }
        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  )
}

/* ─── Sub-components ─── */

function BusinessCard({ business, isTarget }: { business: BusinessInfo; isTarget?: boolean }) {
  return (
    <div style={{
      padding: '20px',
      borderRadius: '12px',
      background: isTarget
        ? 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.06))'
        : 'rgba(255,255,255,0.02)',
      border: `1px solid ${isTarget ? 'rgba(99,102,241,0.3)' : 'var(--border-color)'}`,
      position: 'relative',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    }}>
      {isTarget && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          right: '12px',
          background: 'linear-gradient(135deg, var(--accent-primary), #6366f1)',
          color: '#fff',
          fontSize: '0.65rem',
          fontWeight: 700,
          padding: '3px 10px',
          borderRadius: '6px',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          Senin İşletmen
        </div>
      )}
      <h4 style={{
        fontSize: '0.9rem',
        marginBottom: '12px',
        color: 'var(--text-primary)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {business.name}
      </h4>
      <div style={{ display: 'flex', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
            Rating
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: getRatingColor(business.rating) }}>
            ⭐ {business.rating?.toFixed(1) || '—'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
            Yorumlar
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            {business.review_count ?? '—'}
          </div>
        </div>
      </div>
    </div>
  )
}

function AreaCard({ title, icon, items, color, bgColor, borderColor }: {
  title: string; icon: string; items: string[];
  color: string; bgColor: string; borderColor: string
}) {
  return (
    <div className="glass-panel" style={{
      padding: '24px',
      borderLeft: `4px solid ${color}`,
      background: bgColor,
    }}>
      <h4 style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
        <span>{icon}</span> {title}
      </h4>
      {items.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.map((item, i) => (
            <li key={i} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              lineHeight: 1.5,
            }}>
              <span style={{ color, flexShrink: 0, marginTop: '2px' }}>•</span>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}>
          Veri bulunamadı
        </p>
      )}
    </div>
  )
}

/* ─── Helpers ─── */

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  color: 'var(--text-secondary)',
  fontSize: '0.8rem',
  fontWeight: 500,
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

/**
 * Normalize various API response shapes into our AnalysisResult interface.
 * This handles both structured JSON responses and free-text report responses.
 */
function normalizeResult(data: any): AnalysisResult {
  // If the API returns a structured result matching our shape
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
    }
  }

  // If the API returns a "result" string (free-text report from older API)
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

  // Fallback: wrap everything we can find
  return {
    target_business: null,
    competitors: [],
    strengths: [],
    weaknesses: [],
    equal_areas: [],
    recommendations: { week: [], month: [], year: [] },
    growth_score: 50,
    growth_summary: '',
    full_report: JSON.stringify(data, null, 2),
  }
}

function toStringArray(val: any): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val.map(v => typeof v === 'string' ? v : JSON.stringify(v))
  if (typeof val === 'string') return val.split('\n').filter(s => s.trim())
  return []
}
