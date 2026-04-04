const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  const token = 'IGAAbLa4qDVvhBZAGFjZAHNjbldQWXhUSEtHOENDak5TcHg3bEZASMkREQjZAaWFR1d2kzVHhRbklZAdDJlcWlhQnRnVEx2emhueUNPRmYtVW5USWExUWRGTGczVTNicVVsSENqZA1cxNkUybHFHQURhZAnFIaHlSNXNBN2VHV2t2N3ZAqbwZDZD'
  
  const result = await p.integrationConfig.updateMany({
    where: {
      platform: 'instagram',
      platform_identifier: '26127995610189827'
    },
    data: {
      access_token: token
    }
  })
  
  console.log('Updated', result.count, 'integration(s)')
  
  // Verify
  const int = await p.integrationConfig.findFirst({
    where: { platform: 'instagram' }
  })
  console.log('Token now:', int.access_token ? int.access_token.substring(0, 30) + '...' : 'STILL NONE')
}

main().catch(console.error).finally(() => p.$disconnect())
