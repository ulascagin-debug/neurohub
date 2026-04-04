const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  const users = await p.user.findMany({ select: { id: true, email: true } })
  const biz = await p.business.findMany({ select: { id: true, name: true } })
  
  console.log('Users:')
  users.forEach(u => console.log(' ', u.id, u.email))
  console.log('Businesses:')
  biz.forEach(b => console.log(' ', b.id, b.name))
  
  // Link ALL users to ALL businesses
  for (const u of users) {
    for (const b of biz) {
      const exists = await p.userBusiness.findUnique({
        where: { user_id_business_id: { user_id: u.id, business_id: b.id } }
      })
      if (!exists) {
        await p.userBusiness.create({
          data: { user_id: u.id, business_id: b.id, role: 'owner' }
        })
        console.log('Linked', u.email, 'to', b.name)
      } else {
        console.log('Already linked', u.email, 'to', b.name)
      }
    }
  }
  
  console.log('\nDONE!')
}

main().catch(console.error).finally(() => p.$disconnect())
