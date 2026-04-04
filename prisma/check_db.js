const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  const BIZ = 'cmn6dfjvh00006eocxrnkzf8i'
  
  // Check latest messages
  const msgs = await p.message.findMany({
    where: { business_id: BIZ },
    orderBy: { created_at: 'desc' },
    take: 5,
  })
  console.log('=== LATEST 5 MESSAGES ===')
  msgs.forEach(m => console.log(`[${m.created_at.toISOString()}] ${m.platform} | ${m.user_id} | ${m.content.substring(0, 50)}`))
  
  // Check all reservations
  const res = await p.reservation.findMany({
    where: { business_id: BIZ },
    orderBy: { date: 'desc' },
  })
  console.log('\n=== ALL RESERVATIONS ===')
  res.forEach(r => console.log(`${r.customer_name} | ${r.date} ${r.time} | ${r.party_size} kişi | ${r.status}`))

  console.log(`\nTotal: ${msgs.length >= 5 ? '5+' : msgs.length} msgs shown, ${res.length} reservations`)
}

main().catch(console.error).finally(() => p.$disconnect())
