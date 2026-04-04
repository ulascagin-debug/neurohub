const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  const total = await p.message.count()
  console.log('Total messages:', total)

  const byPlatform = await p.message.groupBy({ by: ['platform'], _count: true })
  console.log('By platform:', JSON.stringify(byPlatform))

  const byStatus = await p.message.groupBy({ by: ['session_status'], _count: true })
  console.log('By status:', JSON.stringify(byStatus))

  const bySid = await p.message.groupBy({ by: ['session_id'], _count: true })
  console.log('Total sessions:', bySid.length)

  const hasRes = await p.message.count({ where: { has_reservation: true } })
  console.log('Messages with reservation:', hasRes)

  // Show some recent messages
  const recent = await p.message.findMany({ orderBy: { created_at: 'desc' }, take: 5 })
  console.log('\nRecent messages:')
  recent.forEach(m => {
    console.log(`  [${m.platform}] ${m.user_id} @ ${m.created_at.toISOString().substring(0,16)} | session: ${m.session_id?.substring(0,8)}... | ${(m.content || '').substring(0,40)}`)
  })
}

main().catch(console.error).finally(() => p.$disconnect())
