"use client"

import { useBusiness } from '@/lib/business-context'
import { useEffect, useState, useCallback, useRef } from 'react'
import { WhatsAppIcon, InstagramIcon } from '@/components/PlatformIcons'

const POLL_INTERVAL = 15000

interface Message {
  id: string
  platform: string
  content: string
  response: string | null
  user_id: string | null
  created_at: string
}

interface Conversation {
  id: string
  session_id: string
  user_id: string
  platform: string
  display_name: string
  last_message: string
  last_time: string
  first_time: string
  message_count: number
  status: string
  has_reservation: boolean
  messages: Message[]
}

type FilterTab = 'all' | 'active' | 'completed' | 'reservation'

export default function MessagesPage() {
  const { activeBusinessId } = useBusiness()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [closing, setClosing] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const fetchConversations = useCallback(() => {
    if (!activeBusinessId) return

    let url = `/api/dashboard/conversations?business_id=${activeBusinessId}`
    if (filter === 'active') url += '&status=active'
    else if (filter === 'completed') url += '&status=completed'
    else if (filter === 'reservation') url += '&has_reservation=true'

    fetch(url)
      .then(res => res.json())
      .then(data => {
        const convs = data.conversations || []
        setConversations(convs)
        setLoading(false)
        setActiveConv(prev => {
          if (!prev) return convs[0] || null
          const still = convs.find((c: Conversation) => c.id === prev.id)
          return still || convs[0] || null
        })
      })
  }, [activeBusinessId, filter])

  useEffect(() => {
    setLoading(true)
    setActiveConv(null)
    fetchConversations()
    const interval = setInterval(fetchConversations, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchConversations])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConv])

  const handleCloseSession = async () => {
    if (!activeConv) return
    setClosing(true)
    const newStatus = activeConv.status === 'active' ? 'completed' : 'active'
    try {
      await fetch('/api/dashboard/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: activeConv.session_id, status: newStatus })
      })
      fetchConversations()
    } catch (e) { console.error(e) }
    setClosing(false)
  }

  if (!activeBusinessId) {
    return (
      <div style={{ textAlign: 'center', paddingTop: '80px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>💬</div>
        <h2>İşletme Seçin</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Mesajları görüntülemek için sol menüden bir işletme seçin.</p>
      </div>
    )
  }

  const filtered = conversations.filter(c => {
    if (search && !c.display_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const counts = {
    all: conversations.length,
    active: conversations.filter(c => c.status === 'active').length,
    completed: conversations.filter(c => c.status === 'completed').length,
    reservation: conversations.filter(c => c.has_reservation).length,
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return 'Şimdi'
    if (diffMins < 60) return `${diffMins}dk`
    if (diffHours < 24) return `${diffHours}sa`
    if (diffDays < 7) return `${diffDays}g`
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
  }

  const formatFullTime = (iso: string) => {
    return new Date(iso).toLocaleString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const filterTabs: { key: FilterTab; label: string; icon: string; color: string }[] = [
    { key: 'all', label: `Tümü`, icon: '📁', color: 'var(--accent-primary)' },
    { key: 'active', label: `Aktif`, icon: '🟢', color: '#10b981' },
    { key: 'completed', label: `Biten`, icon: '⚪', color: '#a1a1aa' },
    { key: 'reservation', label: `Rez.`, icon: '🗓', color: '#f59e0b' },
  ]

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', gap: '0', overflow: 'hidden' }}>
      {/* ─── LEFT: Conversation List ─── */}
      <div style={{
        width: '380px',
        minWidth: '380px',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border-color)',
        background: 'rgba(255,255,255,0.01)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <h1 className="text-gradient" style={{ fontSize: '1.5rem', margin: 0 }}>Mesajlar</h1>
            <span style={{
              background: 'rgba(99,102,241,0.12)',
              color: 'var(--accent-primary)',
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '12px',
            }}>
              {conversations.length} konuşma
            </span>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', margin: '14px 0 12px' }}>
            <span style={{
              position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
              fontSize: '0.85rem', opacity: 0.4,
            }}>🔍</span>
            <input
              id="messages-search"
              type="text"
              placeholder="Kişi veya numara ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px 10px 36px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px', color: 'var(--text-primary)',
                fontSize: '0.85rem', outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
            />
          </div>

          {/* Filter Tabs */}
          <div style={{
            display: 'flex', gap: '3px', marginBottom: '14px',
            background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '3px',
          }}>
            {filterTabs.map(f => (
              <button
                key={f.key}
                id={`filter-${f.key}`}
                onClick={() => setFilter(f.key)}
                style={{
                  flex: 1, padding: '7px 2px', borderRadius: '8px', border: 'none',
                  cursor: 'pointer', fontWeight: 600, fontSize: '0.7rem',
                  transition: 'all 0.25s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                  background: filter === f.key ? `${f.color}18` : 'transparent',
                  color: filter === f.key ? f.color : 'rgba(255,255,255,0.35)',
                  boxShadow: filter === f.key ? `inset 0 0 0 1px ${f.color}30` : 'none',
                }}
              >
                <span style={{ fontSize: '0.65rem' }}>{f.icon}</span>
                {f.label}
                <span style={{
                  fontSize: '0.6rem',
                  opacity: 0.7,
                  marginLeft: '1px',
                }}>
                  {counts[f.key]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              Yükleniyor...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '40px 20px',
              color: 'var(--text-secondary)', fontSize: '0.85rem',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px', opacity: 0.4 }}>📭</div>
              {search ? 'Sonuç bulunamadı' : 'Henüz mesaj yok'}
            </div>
          ) : (
            filtered.map(conv => {
              const isActive = activeConv?.id === conv.id
              const isWA = conv.platform === 'whatsapp'
              const isSessionActive = conv.status === 'active'
              return (
                <button
                  key={conv.id}
                  id={`conv-${conv.id}`}
                  onClick={() => setActiveConv(conv)}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '14px 14px',
                    borderRadius: '12px', border: 'none', cursor: 'pointer',
                    marginBottom: '2px',
                    transition: 'all 0.2s ease',
                    background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
                  }}
                  onMouseOver={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseOut={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Avatar with status dot */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: isWA
                          ? 'linear-gradient(135deg, #25d366, #128c7e)'
                          : 'linear-gradient(135deg, #f09433, #dc2743, #bc1888)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 700, fontSize: '1rem',
                        boxShadow: isActive
                          ? `0 0 16px ${isWA ? 'rgba(37,211,102,0.4)' : 'rgba(220,39,67,0.4)'}`
                          : 'none',
                        transition: 'box-shadow 0.3s',
                      }}>
                        {isWA ? <WhatsAppIcon size={22} /> : <InstagramIcon size={22} />}
                      </div>
                      {/* Status dot */}
                      <div style={{
                        position: 'absolute', bottom: 0, right: 0,
                        width: 12, height: 12, borderRadius: '50%',
                        background: isSessionActive ? '#10b981' : '#52525b',
                        border: '2px solid var(--bg-main)',
                        boxShadow: isSessionActive ? '0 0 6px rgba(16,185,129,0.5)' : 'none',
                      }} />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                        <span style={{
                          fontWeight: 600, fontSize: '0.85rem',
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          maxWidth: '180px',
                        }}>
                          {conv.display_name}
                        </span>
                        <span style={{
                          fontSize: '0.68rem', color: 'var(--text-secondary)', flexShrink: 0,
                        }}>
                          {formatTime(conv.last_time)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '0.78rem', color: 'var(--text-secondary)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          maxWidth: '170px',
                        }}>
                          {conv.last_message}
                        </span>
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0, alignItems: 'center' }}>
                          {conv.has_reservation && (
                            <span style={{
                              background: 'rgba(245,158,11,0.15)',
                              color: '#f59e0b',
                              fontSize: '0.6rem', fontWeight: 700,
                              padding: '2px 6px', borderRadius: '8px',
                            }}>
                              🗓 Rez.
                            </span>
                          )}
                          <span style={{
                            background: isWA ? 'rgba(37,211,102,0.15)' : 'rgba(220,39,67,0.15)',
                            color: isWA ? '#25d366' : '#e1306c',
                            fontSize: '0.63rem', fontWeight: 700,
                            padding: '2px 7px', borderRadius: '10px',
                          }}>
                            {conv.message_count}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ─── RIGHT: Chat View ─── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        background: 'rgba(0,0,0,0.15)', overflow: 'hidden',
      }}>
        {!activeConv ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)', gap: '12px',
          }}>
            <div style={{ fontSize: '4rem', opacity: 0.3 }}>📂</div>
            <p style={{ fontSize: '1rem' }}>Konuşma Klasörü Seçin</p>
            <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Soldaki listeden bir konuşma klasörü seçerek mesajları görüntüleyin</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div style={{
              padding: '14px 24px',
              background: 'rgba(255,255,255,0.03)',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', gap: '14px',
              backdropFilter: 'blur(12px)',
            }}>
              {/* Avatar */}
              <div style={{
                width: 42, height: 42, borderRadius: '50%',
                background: activeConv.platform === 'whatsapp'
                  ? 'linear-gradient(135deg, #25d366, #128c7e)'
                  : 'linear-gradient(135deg, #f09433, #dc2743, #bc1888)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: '1rem',
              }}>
                {activeConv.platform === 'whatsapp' ? <WhatsAppIcon size={20} /> : <InstagramIcon size={20} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  📂 {activeConv.display_name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                  <span style={{
                    fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', fontWeight: 600,
                    background: activeConv.platform === 'whatsapp' ? 'rgba(37,211,102,0.12)' : 'rgba(220,39,67,0.12)',
                    color: activeConv.platform === 'whatsapp' ? '#25d366' : '#e1306c',
                  }}>
                    {activeConv.platform === 'whatsapp' ? 'WhatsApp' : 'Instagram'}
                  </span>
                  <span style={{
                    fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', fontWeight: 600,
                    background: activeConv.status === 'active' ? 'rgba(16,185,129,0.12)' : 'rgba(161,161,170,0.12)',
                    color: activeConv.status === 'active' ? '#10b981' : '#a1a1aa',
                  }}>
                    {activeConv.status === 'active' ? '🟢 Aktif' : '⚪ Tamamlandı'}
                  </span>
                  {activeConv.has_reservation && (
                    <span style={{
                      fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', fontWeight: 600,
                      background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
                    }}>
                      🗓 Rezervasyon
                    </span>
                  )}
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    {activeConv.message_count} mesaj
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {/* Contact info */}
                <div style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px', padding: '6px 12px',
                  fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'monospace',
                }}>
                  {activeConv.platform === 'whatsapp' ? '📞 ' : '@ '}
                  {activeConv.user_id}
                </div>
                {/* Close/Reopen */}
                <button
                  id="btn-toggle-session"
                  onClick={handleCloseSession}
                  disabled={closing}
                  style={{
                    padding: '6px 14px', borderRadius: '8px', border: 'none',
                    cursor: closing ? 'wait' : 'pointer',
                    fontWeight: 600, fontSize: '0.72rem',
                    transition: 'all 0.2s',
                    background: activeConv.status === 'active'
                      ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                    color: activeConv.status === 'active' ? '#ef4444' : '#10b981',
                    opacity: closing ? 0.6 : 1,
                  }}
                >
                  {closing ? '...' : activeConv.status === 'active' ? '✕ Kapat' : '↻ Yeniden Aç'}
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '20px 24px',
              display: 'flex', flexDirection: 'column', gap: '4px',
            }}>
              {/* Session start indicator */}
              <div style={{ textAlign: 'center', margin: '8px 0 16px' }}>
                <span style={{
                  background: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.15)',
                  padding: '5px 18px', borderRadius: '20px',
                  fontSize: '0.72rem', color: 'var(--accent-primary)',
                  fontWeight: 600,
                }}>
                  📂 Konuşma Başlangıcı — {formatFullTime(activeConv.messages[0]?.created_at)}
                </span>
              </div>

              {activeConv.messages.map((msg, i) => {
                const showDate = i > 0 && (
                  new Date(msg.created_at).toDateString() !==
                  new Date(activeConv.messages[i - 1].created_at).toDateString()
                )

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div style={{ textAlign: 'center', margin: '16px 0' }}>
                        <span style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid var(--border-color)',
                          padding: '4px 16px', borderRadius: '20px',
                          fontSize: '0.7rem', color: 'var(--text-secondary)',
                        }}>
                          {new Date(msg.created_at).toLocaleDateString('tr-TR', {
                            day: '2-digit', month: 'long', year: 'numeric'
                          })}
                        </span>
                      </div>
                    )}

                    {/* User message (incoming) */}
                    {msg.content && (
                      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '4px' }}>
                        <div style={{
                          maxWidth: '70%', padding: '10px 14px',
                          borderRadius: '16px 16px 16px 4px',
                          background: 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          fontSize: '0.88rem', lineHeight: 1.5,
                          color: 'var(--text-primary)', position: 'relative',
                        }}>
                          <div>{msg.content}</div>
                          <div style={{
                            fontSize: '0.65rem', color: 'var(--text-secondary)',
                            marginTop: '4px', textAlign: 'right', opacity: 0.7,
                          }}>
                            {new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bot response (outgoing) */}
                    {msg.response && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
                        <div style={{
                          maxWidth: '70%', padding: '10px 14px',
                          borderRadius: '16px 16px 4px 16px',
                          background: activeConv.platform === 'whatsapp'
                            ? 'linear-gradient(135deg, rgba(37,211,102,0.15), rgba(18,140,126,0.2))'
                            : 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.2))',
                          border: `1px solid ${activeConv.platform === 'whatsapp' ? 'rgba(37,211,102,0.15)' : 'rgba(99,102,241,0.15)'}`,
                          fontSize: '0.88rem', lineHeight: 1.5,
                          color: 'var(--text-primary)', position: 'relative',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                            <span style={{
                              fontSize: '0.65rem', fontWeight: 700,
                              color: activeConv.platform === 'whatsapp' ? '#25d366' : 'var(--accent-primary)',
                              opacity: 0.9,
                            }}>
                              🤖 Chatbot
                            </span>
                          </div>
                          <div style={{ whiteSpace: 'pre-wrap' }}>{msg.response}</div>
                          <div style={{
                            fontSize: '0.65rem', color: 'var(--text-secondary)',
                            marginTop: '4px', textAlign: 'right', opacity: 0.7,
                          }}>
                            {new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Footer Info */}
            <div style={{
              padding: '10px 24px',
              background: 'rgba(255,255,255,0.02)',
              borderTop: '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
            }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', opacity: 0.6 }}>
                🤖 Bu konuşma chatbot tarafından otomatik yönetilmektedir
              </span>
              {activeConv.has_reservation && (
                <a
                  href="/reservations"
                  style={{
                    fontSize: '0.72rem', fontWeight: 600,
                    color: '#f59e0b', textDecoration: 'none',
                    background: 'rgba(245,158,11,0.1)',
                    padding: '4px 12px', borderRadius: '8px',
                    transition: 'all 0.2s',
                  }}
                >
                  🗓 Rezervasyon Detaylarını Gör →
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
