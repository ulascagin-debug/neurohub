const {PrismaClient} = require('@prisma/client')
const p = new PrismaClient()
p.business.findFirst().then(b => {
  console.log('BUSINESS_ID=' + b.id)
  p.$disconnect()
})
