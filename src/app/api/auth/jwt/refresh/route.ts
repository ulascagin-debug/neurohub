export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyRefreshToken, signAccessToken } from '@/lib/jwt'
import { validateBody, refreshTokenSchema } from '@/lib/validators'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Validate input
    const validation = validateBody(refreshTokenSchema, body)
    if (!validation.success) return validation.response

    const { refresh_token } = validation.data

    // Verify refresh token
    const payload = await verifyRefreshToken(refresh_token)
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Geçersiz veya süresi dolmuş refresh token' }, { status: 401 })
    }

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        businesses: { take: 1 },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 401 })
    }

    const businessId = user.businesses[0]?.business_id || undefined

    // Generate new access token
    const access_token = await signAccessToken({
      userId: user.id,
      email: user.email || '',
      businessId,
    })

    return NextResponse.json({
      access_token,
      token_type: 'Bearer',
      expires_in: 900,
    })
  } catch (error) {
    console.error('[jwt/refresh] Error:', error)
    return NextResponse.json({ error: 'Token refresh failed' }, { status: 500 })
  }
}
