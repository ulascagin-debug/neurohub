const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function main() {
  const BIZ_ID = 'cmn6dfjvh00006eocxrnkzf8i'

  // 1. Import conversation logs
  const logsPath = path.join('c:', 'cafe-chatbot', 'conversation_logs.json')
  const logs = JSON.parse(fs.readFileSync(logsPath, 'utf-8'))
  
  console.log(`📨 Importing ${logs.length} conversation logs...`)
  
  for (const log of logs) {
    await prisma.message.create({
      data: {
        business_id: BIZ_ID,
        platform: log.sender_id === 'test_user' ? 'test' : 'instagram',
        content: log.user_message,
        response: log.ai_reply,
        user_id: log.sender_id,
        created_at: new Date(log.timestamp),
      },
    })
  }
  console.log(`✅ ${logs.length} messages imported`)

  // 2. Import reservations
  const resPath = path.join('c:', 'cafe-chatbot', 'reservations.json')
  const reservations = JSON.parse(fs.readFileSync(resPath, 'utf-8'))
  
  console.log(`📋 Importing ${reservations.length} reservations...`)
  
  for (const res of reservations) {
    await prisma.reservation.create({
      data: {
        business_id: BIZ_ID,
        customer_name: res.customer_name,
        date: res.date,
        time: res.time,
        party_size: res.party_size,
        status: res.status || 'confirmed',
      },
    })
  }
  console.log(`✅ ${reservations.length} reservations imported`)

  // 3. Summary
  const totalMessages = await prisma.message.count({ where: { business_id: BIZ_ID } })
  const totalReservations = await prisma.reservation.count({ where: { business_id: BIZ_ID } })
  
  console.log('\n🎉 Import complete!')
  console.log(`📨 Total messages: ${totalMessages}`)
  console.log(`📋 Total reservations: ${totalReservations}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
