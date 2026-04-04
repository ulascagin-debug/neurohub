const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const p = new PrismaClient()
async function main() {
  const lines = []
  const biz = await p.business.findFirst()
  lines.push('BIZ: ' + biz.id + ' | ' + biz.name)
  const cfg = await p.chatbotConfig.findUnique({ where: { business_id: biz.id } })
  if (cfg) {
    lines.push('CFG_ENABLED: ' + cfg.chatbot_enabled)
    lines.push('CFG_TONE: ' + cfg.tone)
    lines.push('CFG_WEBHOOK: ' + cfg.webhook_url)
    lines.push('CFG_ADDR: ' + cfg.address)
    lines.push('CFG_PHONE: ' + cfg.phone)
    lines.push('CFG_MENU: ' + (cfg.menu ? 'SET' : 'NULL'))
    lines.push('CFG_HOURS: ' + (cfg.working_hours ? 'SET' : 'NULL'))
  } else {
    lines.push('CFG: NULL')
  }
  const ints = await p.integrationConfig.findMany({ where: { business_id: biz.id } })
  ints.forEach(i => {
    lines.push('INT: ' + i.platform + ' | ' + i.platform_identifier + ' | token: ' + (i.access_token ? i.access_token.substring(0,30)+'...' : 'NONE'))
  })
  if (ints.length === 0) lines.push('NO INTEGRATIONS')
  fs.writeFileSync('prisma/db_state.txt', lines.join('\n'))
  console.log('Written to prisma/db_state.txt')
}
main().catch(console.error).finally(() => p.$disconnect())
