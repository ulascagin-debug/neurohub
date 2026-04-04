import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const BUSINESS_ID = 'cmn6dfjvh00006eocxrnkzf8i'
  const IG_PAGE_ID = '26127995610189827'

  // Create Business
  const business = await prisma.business.upsert({
    where: { id: BUSINESS_ID },
    update: {},
    create: {
      id: BUSINESS_ID,
      name: 'Fookah Cafe',
      location: 'Istanbul',
    },
  })
  console.log('✅ Business:', business.id)

  // Create ChatbotConfig
  const config = await prisma.chatbotConfig.upsert({
    where: { business_id: BUSINESS_ID },
    update: { chatbot_enabled: true },
    create: {
      business_id: BUSINESS_ID,
      chatbot_enabled: true,
      tone: 'friendly',
      table_count: 10,
      address: 'Istanbul',
    },
  })
  console.log('✅ ChatbotConfig:', config.id)

  // Create Instagram Integration
  const igIntegration = await prisma.integrationConfig.upsert({
    where: {
      platform_platform_identifier: {
        platform: 'instagram',
        platform_identifier: IG_PAGE_ID,
      },
    },
    update: { business_id: BUSINESS_ID },
    create: {
      business_id: BUSINESS_ID,
      platform: 'instagram',
      platform_identifier: IG_PAGE_ID,
    },
  })
  console.log('✅ Instagram Integration:', igIntegration.id)

  console.log('\n🎉 Seed completed successfully!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
