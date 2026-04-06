import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { validateBody, businessCreateSchema, businessUpdateSchema } from '@/lib/validators'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  try {
    // Filter by UserBusiness relation if user is logged in
    const where = session?.user?.id 
      ? { users: { some: { user_id: session.user.id } } } 
      : {}
    const businesses = await prisma.business.findMany({ where })
    return NextResponse.json({ businesses })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 })
  }

  try {
    const body = await req.json()

    // Validate input
    const validation = validateBody(businessCreateSchema, body)
    if (!validation.success) return validation.response

    const { name, location, business_type, place_id, maps_url, maps_rating, maps_review_count } = validation.data

    const business = await prisma.business.create({
      data: {
        name,
        location,
        business_type: business_type || null,
        place_id: place_id || null,
        maps_url: maps_url || null,
        maps_rating: maps_rating ?? null,
        maps_review_count: maps_review_count ?? null,
        owner_id: session.user.id,
        is_verified: true,
      }
    })

    // Also create UserBusiness link
    await prisma.userBusiness.create({
      data: {
        user_id: session.user.id,
        business_id: business.id,
        role: 'owner',
      }
    })

    return NextResponse.json({ business })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { id, name, location, business_type, place_id, maps_url, maps_rating, maps_review_count, estimated_monthly_revenue, employee_count } = body

    if (!id) {
      return NextResponse.json({ error: "id gerekli" }, { status: 400 })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (location !== undefined) updateData.location = location || null
    if (business_type !== undefined) updateData.business_type = business_type || null
    if (place_id !== undefined) updateData.place_id = place_id || null
    if (maps_url !== undefined) updateData.maps_url = maps_url || null
    if (maps_rating !== undefined) updateData.maps_rating = maps_rating ?? null
    if (maps_review_count !== undefined) updateData.maps_review_count = maps_review_count ?? null
    if (estimated_monthly_revenue !== undefined) updateData.estimated_monthly_revenue = estimated_monthly_revenue ?? null
    if (employee_count !== undefined) updateData.employee_count = employee_count ?? null

    const business = await prisma.business.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ business })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}
