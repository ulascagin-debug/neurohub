export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/review-snapshots?business_id=xxx&days=30
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('business_id')
  const days = parseInt(searchParams.get('days') || '30', 10)

  if (!businessId) {
    return NextResponse.json({ error: 'business_id gerekli' }, { status: 400 })
  }

  try {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const snapshots = await prisma.reviewSnapshot.findMany({
      where: {
        business_id: businessId,
        snapshot_date: { gte: since },
      },
      orderBy: { snapshot_date: 'desc' },
      take: 100,
    })

    return NextResponse.json({ snapshots })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch snapshots' }, { status: 500 })
  }
}
