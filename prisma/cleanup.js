const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const BIZ_ID = 'cmn6dfjvh00006eocxrnkzf8i'

  // Real Instagram sender IDs from conversation_logs.json
  const realSenderIds = ['1079777451875120', '1560000221757238']

  // 1. Delete all non-real messages (test, whatsapp samples, seeded samples)
  const deletedMsgs = await prisma.message.deleteMany({
    where: {
      business_id: BIZ_ID,
      NOT: {
        AND: [
          { platform: 'instagram' },
          { user_id: { in: realSenderIds } }
        ]
      }
    }
  })
  console.log(`🗑️ Deleted ${deletedMsgs.count} test/sample messages`)

  // 2. Delete all non-real reservations (keep only Çağın, Ekin, Arda, Mahmut from reservations.json)
  const realCustomers = ['Çağın', 'Ekin', 'Arda', 'Mahmut']
  const deletedRes = await prisma.reservation.deleteMany({
    where: {
      business_id: BIZ_ID,
      customer_name: { notIn: realCustomers }
    }
  })
  console.log(`🗑️ Deleted ${deletedRes.count} test/sample reservations`)

  // 3. Delete hardcoded IntegrationConfig (user wants to connect via UI)
  const deletedInt = await prisma.integrationConfig.deleteMany({
    where: { business_id: BIZ_ID }
  })
  console.log(`🗑️ Deleted ${deletedInt.count} hardcoded integration configs`)

  // Summary
  const msgs = await prisma.message.count({ where: { business_id: BIZ_ID } })
  const res = await prisma.reservation.count({ where: { business_id: BIZ_ID } })
  const ints = await prisma.integrationConfig.count({ where: { business_id: BIZ_ID } })
  
  console.log(`\n✅ Remaining: ${msgs} messages, ${res} reservations, ${ints} integrations`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
