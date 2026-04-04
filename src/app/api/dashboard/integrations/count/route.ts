import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const MAX_INTEGRATIONS_PER_USER = 3

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ count: 0, max: MAX_INTEGRATIONS_PER_USER })
  }

  try {
    const userBusinesses = await prisma.business.findMany({
      where: { owner_id: session.user.id },
      select: { id: true }
    })
    const businessIds = userBusinesses.map(b => b.id)

    const count = await prisma.integrationConfig.count({
      where: { business_id: { in: businessIds } }
    })

    return NextResponse.json({ count, max: MAX_INTEGRATIONS_PER_USER, remaining: MAX_INTEGRATIONS_PER_USER - count })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch count" }, { status: 500 })
  }
}
