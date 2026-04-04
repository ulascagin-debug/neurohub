const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const BIZ_ID = 'cmn6dfjvh00006eocxrnkzf8i'

  // Delete ALL old messages (imported from old conversation_logs.json)
  const delMsgs = await prisma.message.deleteMany({ where: { business_id: BIZ_ID } })
  console.log(`🗑️ Deleted ${delMsgs.count} old messages`)

  // Delete ALL old reservations (imported from old reservations.json)
  const delRes = await prisma.reservation.deleteMany({ where: { business_id: BIZ_ID } })
  console.log(`🗑️ Deleted ${delRes.count} old reservations`)

  console.log('\n✅ Clean slate — only IntegrationConfig and ChatbotConfig remain')
  
  // Show what's left
  const config = await prisma.chatbotConfig.findUnique({ where: { business_id: BIZ_ID } })
  const integrations = await prisma.integrationConfig.findMany({ where: { business_id: BIZ_ID } })
  
  console.log(`📋 ChatbotConfig: tone=${config?.tone}, tables=${config?.table_count}`)
  integrations.forEach(i => console.log(`🔗 Integration: ${i.platform} → ${i.platform_identifier}`))
}

main().catch(console.error).finally(() => prisma.$disconnect())
