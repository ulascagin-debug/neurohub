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

    const { name, location } = validation.data

    const business = await prisma.business.create({
      data: {
        name,
        location,
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

    // Validate input
    const validation = validateBody(businessUpdateSchema, body)
    if (!validation.success) return validation.response

    const { id, name, location } = validation.data

    const business = await prisma.business.update({
      where: { id },
      data: { name, location: location || null },
    })

    return NextResponse.json({ business })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}
