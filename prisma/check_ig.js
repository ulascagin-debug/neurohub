const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  const integrations = await p.integrationConfig.findMany({
    where: { platform: 'instagram' }
  })
  console.log('Instagram integrations:')
  integrations.forEach(i => {
    console.log(`  ID: ${i.id}`)
    console.log(`  Business: ${i.business_id}`)
    console.log(`  Identifier: ${i.platform_identifier}`)
    console.log(`  Token: ${i.access_token ? i.access_token.substring(0, 30) + '...' : 'none'}`)
  })
}

main().catch(console.error).finally(() => p.$disconnect())
