import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/competitors?business_id=xxx
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('business_id')

  if (!businessId) {
    return NextResponse.json({ error: 'business_id gerekli' }, { status: 400 })
  }

  try {
    const competitors = await prisma.competitorBusiness.findMany({
      where: { business_id: businessId },
      orderBy: { created_at: 'desc' },
    })
    return NextResponse.json({ competitors })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch competitors' }, { status: 500 })
  }
}

// POST /api/competitors - Add competitor
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { business_id, place_id, name, address, rating, review_count } = body

    if (!business_id || !place_id || !name) {
      return NextResponse.json({ error: 'business_id, place_id ve name gerekli' }, { status: 400 })
    }

    const competitor = await prisma.competitorBusiness.upsert({
      where: {
        business_id_place_id: { business_id, place_id },
      },
      update: {
        name,
        address: address || null,
        rating: rating != null ? Number(rating) : null,
        review_count: review_count != null ? Number(review_count) : null,
      },
      create: {
        business_id,
        place_id,
        name,
        address: address || null,
        rating: rating != null ? Number(rating) : null,
        review_count: review_count != null ? Number(review_count) : null,
      },
    })

    return NextResponse.json({ competitor })
  } catch (error: any) {
    console.error('[competitors] POST error:', error)
    return NextResponse.json({ error: 'Failed to add competitor' }, { status: 500 })
  }
}

// DELETE /api/competitors
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
    }

    await prisma.competitorBusiness.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete competitor' }, { status: 500 })
  }
}
