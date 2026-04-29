export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateBody, messageSchema } from '@/lib/validators'

const SESSION_GAP_MS = 3 * 60 * 60 * 1000 // 3 hours
const RESERVATION_KEYWORDS = ['rezervasyon', 'reservation', 'booking', 'randevu', 'appointment']

function generateSessionId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 25; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

function hasReservationKeyword(text: string | null | undefined): boolean {
  if (!text) return false
  const lower = text.toLowerCase()
  return RESERVATION_KEYWORDS.some(k => lower.includes(k))
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Validate input
    const validation = validateBody(messageSchema, body)
    if (!validation.success) return validation.response

    const data = validation.data

    const businessId = data.business_id
    const platform = data.platform || 'unknown'
    const userId = data.user_id || null
    const content = data.message || data.content || ''
    const response = data.response || null

    // Find the last message from same user to determine session
    let sessionId: string
    let sessionStatus = 'active'
    let hasReservation = false

    if (userId) {
      const lastMsg = await prisma.message.findFirst({
        where: {
          business_id: businessId,
          platform,
          user_id: userId,
        },
        orderBy: { created_at: 'desc' },
      })

      if (lastMsg && lastMsg.session_id) {
        const lastTime = new Date(lastMsg.created_at).getTime()
        const now = Date.now()

        if (now - lastTime > SESSION_GAP_MS) {
          // Gap exceeded → new session
          sessionId = generateSessionId()

          // Mark old session as completed
          await prisma.message.updateMany({
            where: { session_id: lastMsg.session_id },
            data: { session_status: 'completed' }
          })
        } else {
          // Continue existing session
          sessionId = lastMsg.session_id
          hasReservation = lastMsg.has_reservation
        }
      } else {
        // First message from this user → new session
        sessionId = generateSessionId()
      }
    } else {
      sessionId = generateSessionId()
    }

    // Check reservation keywords in current message
    if (hasReservationKeyword(content) || hasReservationKeyword(response)) {
      hasReservation = true
    }

    const message = await prisma.message.create({
      data: {
        business_id: businessId,
        platform,
        content,
        response,
        user_id: userId,
        session_id: sessionId,
        session_status: sessionStatus,
        has_reservation: hasReservation,
      }
    })

    // If this message has reservation, update all messages in this session
    if (hasReservation) {
      await prisma.message.updateMany({
        where: { session_id: sessionId },
        data: { has_reservation: true }
      })
    }

    return NextResponse.json({ success: true, message })
  } catch (error) {
    console.error("[messages] Error:", error)
    return NextResponse.json({ error: "Failed to store message" }, { status: 500 })
  }
}
