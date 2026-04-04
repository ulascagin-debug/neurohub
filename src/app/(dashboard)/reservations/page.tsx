"use client"

import { useBusiness } from '@/lib/business-context'
import { useEffect, useState, useCallback } from 'react'

const POLL_INTERVAL = 15000

export default function ReservationsPage() {
  const { activeBusinessId } = useBusiness()
  const [reservations, setReservations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReservations = useCallback(() => {
    if (!activeBusinessId) return
    fetch(`/api/dashboard/reservations?business_id=${activeBusinessId}`)
      .then(res => res.json())
      .then(data => {
        setReservations(data.reservations || [])
        setLoading(false)
      })
  }, [activeBusinessId])

  useEffect(() => {
    setLoading(true)
    fetchReservations()
    const interval = setInterval(fetchReservations, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchReservations])

  if (!activeBusinessId) return <div>Please select a business.</div>

  return (
    <div>
      <h1 className="text-gradient">Reservations</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        List of all reservations made via the chatbot.
      </p>

      <div className="glass-panel" style={{ padding: '24px' }}>
        {loading ? (
          <p>Loading reservations...</p>
        ) : reservations.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No reservations found for this business.</p>
        ) : (
          <div className="table-container">
            <table className="styled-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Party Size</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map(res => (
                  <tr key={res.id}>
                    <td style={{ fontWeight: 500 }}>{res.customer_name}</td>
                    <td>{res.date}</td>
                    <td>{res.time}</td>
                    <td>
                      <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '12px' }}>
                        {res.party_size}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        background: res.status === 'confirmed' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: res.status === 'confirmed' ? 'var(--success)' : 'var(--danger)',
                        padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold',
                      }}>
                        {res.status || 'confirmed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
