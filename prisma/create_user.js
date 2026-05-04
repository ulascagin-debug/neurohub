const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

async function main() {
  const email = 'growthpersonal065@gmail.com'
  const password = 'admin1234'
  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hashedPassword },
    create: {
      email,
      name: 'Admin',
      password: hashedPassword,
      plan: 'pro',
      onboarding_completed: false,
    },
  })

  console.log('✅ User created/updated:', user.id, user.email)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
