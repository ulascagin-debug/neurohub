const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const SESSION_GAP_MS = 3 * 60 * 60 * 1000 // 3 hours
const RESERVATION_KEYWORDS = ['rezervasyon', 'reservation', 'booking', 'randevu', 'appointment']

function generateId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 25; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

function hasReservationKeyword(text) {
  if (!text) return false
  const lower = text.toLowerCase()
  return RESERVATION_KEYWORDS.some(k => lower.includes(k))
}

async function main() {
  console.log('🔄 Starting session migration...')

  const messages = await prisma.message.findMany({
    orderBy: { created_at: 'asc' }
  })

  console.log(`📨 Total messages: ${messages.length}`)

  // Group by business_id + platform + user_id
  const grouped = new Map()
  for (const msg of messages) {
    const key = `${msg.business_id}::${msg.platform}::${msg.user_id || 'anonymous'}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key).push(msg)
  }

  console.log(`👥 Unique contacts: ${grouped.size}`)

  let sessionCount = 0
  let updateCount = 0
  const now = Date.now()

  for (const [key, msgs] of grouped) {
    let currentSessionId = generateId()
    let sessionHasReservation = false
    let sessionMsgIds = []
    sessionCount++

    for (let i = 0; i < msgs.length; i++) {
      const msg = msgs[i]

      // Check if new session needed (gap > 3 hours from previous)
      if (i > 0) {
        const prevTime = new Date(msgs[i - 1].created_at).getTime()
        const currTime = new Date(msg.created_at).getTime()
        if (currTime - prevTime > SESSION_GAP_MS) {
          // Finalize previous session
          const prevSessionComplete = (now - prevTime) > SESSION_GAP_MS
          if (prevSessionComplete) {
            await prisma.message.updateMany({
              where: { id: { in: sessionMsgIds } },
              data: {
                session_id: currentSessionId,
                session_status: 'completed',
                has_reservation: sessionHasReservation
              }
            })
          } else {
            await prisma.message.updateMany({
              where: { id: { in: sessionMsgIds } },
              data: {
                session_id: currentSessionId,
                session_status: 'active',
                has_reservation: sessionHasReservation
              }
            })
          }
          updateCount += sessionMsgIds.length

          // Start new session
          currentSessionId = generateId()
          sessionHasReservation = false
          sessionMsgIds = []
          sessionCount++
        }
      }

      // Check reservation keywords
      if (hasReservationKeyword(msg.content) || hasReservationKeyword(msg.response)) {
        sessionHasReservation = true
      }

      sessionMsgIds.push(msg.id)
    }

    // Finalize last session
    if (sessionMsgIds.length > 0) {
      const lastMsgTime = new Date(msgs[msgs.length - 1].created_at).getTime()
      const isCompleted = (now - lastMsgTime) > SESSION_GAP_MS

      await prisma.message.updateMany({
        where: { id: { in: sessionMsgIds } },
        data: {
          session_id: currentSessionId,
          session_status: isCompleted ? 'completed' : 'active',
          has_reservation: sessionHasReservation
        }
      })
      updateCount += sessionMsgIds.length
    }
  }

  console.log(`✅ Migration complete: ${sessionCount} sessions created, ${updateCount} messages updated`)
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
