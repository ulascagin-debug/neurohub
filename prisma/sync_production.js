const PRODUCTION_URL = 'https://neuro-hub.duckdns.org'

async function main() {
  console.log('🔍 Checking production messages...')

  // First, get the business ID from local DB
  const { PrismaClient } = require('@prisma/client')
  const prisma = new PrismaClient()

  const businesses = await prisma.business.findMany()
  console.log('Local businesses:', businesses.map(b => `${b.id} - ${b.name}`))

  if (businesses.length === 0) {
    console.log('❌ No businesses found locally')
    await prisma.$disconnect()
    return
  }

  const bizId = businesses[0].id

  // Try fetching from production API
  try {
    const res = await fetch(`${PRODUCTION_URL}/api/dashboard/messages?business_id=${bizId}`)
    if (!res.ok) {
      console.log(`❌ Production API returned ${res.status}: ${await res.text()}`)
      await prisma.$disconnect()
      return
    }
    const data = await res.json()
    const messages = data.messages || []
    console.log(`📨 Production has ${messages.length} messages for business ${bizId}`)

    if (messages.length > 0) {
      console.log('\n📋 Sample messages:')
      messages.slice(0, 10).forEach(m => {
        console.log(`  [${m.platform}] ${m.user_id || 'anon'} @ ${m.created_at}: ${(m.content || '').substring(0, 50)}`)
      })
    }

    // Check how many we have locally
    const localCount = await prisma.message.count({ where: { business_id: bizId } })
    console.log(`\n📊 Local DB has ${localCount} messages`)
    console.log(`📊 Production has ${messages.length} messages`)
    console.log(`📊 Missing: ${messages.length - localCount} messages`)

    if (messages.length > localCount) {
      console.log('\n⬇️ Importing missing messages from production...')

      // Get local message IDs to avoid duplicates
      const localMessages = await prisma.message.findMany({
        where: { business_id: bizId },
        select: { id: true }
      })
      const localIds = new Set(localMessages.map(m => m.id))

      let imported = 0
      for (const msg of messages) {
        if (!localIds.has(msg.id)) {
          try {
            await prisma.message.create({
              data: {
                id: msg.id,
                business_id: bizId,
                platform: msg.platform || 'unknown',
                content: msg.content || '',
                response: msg.response || null,
                user_id: msg.user_id || null,
                created_at: new Date(msg.created_at),
              }
            })
            imported++
          } catch (e) {
            // Skip duplicates
          }
        }
      }
      console.log(`✅ Imported ${imported} new messages`)

      // Run session migration on newly imported messages
      if (imported > 0) {
        console.log('\n🔄 Assigning sessions to imported messages...')
        
        const SESSION_GAP_MS = 3 * 60 * 60 * 1000
        const RESERVATION_KEYWORDS = ['rezervasyon', 'reservation', 'booking', 'randevu', 'appointment']

        function generateId() {
          const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
          let id = ''
          for (let i = 0; i < 25; i++) id += chars[Math.floor(Math.random() * chars.length)]
          return id
        }

        // Get ALL messages (including old ones), re-session everything
        const allMessages = await prisma.message.findMany({
          where: { business_id: bizId },
          orderBy: { created_at: 'asc' }
        })

        const grouped = new Map()
        for (const msg of allMessages) {
          const key = `${msg.platform}::${msg.user_id || 'anonymous'}`
          if (!grouped.has(key)) grouped.set(key, [])
          grouped.get(key).push(msg)
        }

        let sessionCount = 0
        const now = Date.now()

        for (const [key, msgs] of grouped) {
          let currentSessionId = generateId()
          let sessionHasRes = false
          let sessionMsgIds = []
          sessionCount++

          for (let i = 0; i < msgs.length; i++) {
            if (i > 0) {
              const prevTime = new Date(msgs[i - 1].created_at).getTime()
              const currTime = new Date(msgs[i].created_at).getTime()
              if (currTime - prevTime > SESSION_GAP_MS) {
                const prevComplete = (now - prevTime) > SESSION_GAP_MS
                await prisma.message.updateMany({
                  where: { id: { in: sessionMsgIds } },
                  data: { session_id: currentSessionId, session_status: prevComplete ? 'completed' : 'active', has_reservation: sessionHasRes }
                })
                currentSessionId = generateId()
                sessionHasRes = false
                sessionMsgIds = []
                sessionCount++
              }
            }
            const c = (msgs[i].content || '').toLowerCase()
            const r = (msgs[i].response || '').toLowerCase()
            if (RESERVATION_KEYWORDS.some(k => c.includes(k) || r.includes(k))) sessionHasRes = true
            sessionMsgIds.push(msgs[i].id)
          }

          if (sessionMsgIds.length > 0) {
            const lastTime = new Date(msgs[msgs.length - 1].created_at).getTime()
            const isComplete = (now - lastTime) > SESSION_GAP_MS
            await prisma.message.updateMany({
              where: { id: { in: sessionMsgIds } },
              data: { session_id: currentSessionId, session_status: isComplete ? 'completed' : 'active', has_reservation: sessionHasRes }
            })
          }
        }

        console.log(`✅ ${sessionCount} sessions created from ${allMessages.length} messages`)
      }
    }
  } catch (e) {
    console.error('❌ Error contacting production:', e.message)
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
