export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { signAccessToken, signRefreshToken } from '@/lib/jwt'
import { validateBody, loginSchema } from '@/lib/validators'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Validate input
    const validation = validateBody(loginSchema, body)
    if (!validation.success) return validation.response

    const { email, password } = validation.data

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        businesses: {
          include: { business: true },
          take: 1,
        },
      },
    })

    if (!user || !user.password) {
      return NextResponse.json({ error: 'Email veya şifre hatalı' }, { status: 401 })
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return NextResponse.json({ error: 'Email veya şifre hatalı' }, { status: 401 })
    }

    // Get first business_id
    const businessId = user.businesses[0]?.business_id || undefined

    // Generate tokens
    const access_token = await signAccessToken({
      userId: user.id,
      email: user.email || '',
      businessId,
    })
    const refresh_token = await signRefreshToken({
      userId: user.id,
      email: user.email || '',
    })

    return NextResponse.json({
      access_token,
      refresh_token,
      token_type: 'Bearer',
      expires_in: 900, // 15 minutes in seconds
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      business_id: businessId || null,
    })
  } catch (error) {
    console.error('[jwt/login] Error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
