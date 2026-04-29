export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { signAccessToken, signRefreshToken } from '@/lib/jwt'
import { validateBody, registerSchema } from '@/lib/validators'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Validate input
    const validation = validateBody(registerSchema, body)
    if (!validation.success) return validation.response

    const { name, email, password } = validation.data

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Bu email zaten kayıtlı' }, { status: 409 })
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        name: name || email.split('@')[0],
        email,
        password: hashedPassword,
      },
    })

    // Auto-create a business for the user
    const businessName = name ? `${name} İşletmesi` : 'Yeni İşletme'
    const business = await prisma.business.create({
      data: {
        name: businessName,
        owner_id: user.id,
        is_verified: true,
      },
    })

    // Link user to business
    await prisma.userBusiness.create({
      data: {
        user_id: user.id,
        business_id: business.id,
        role: 'owner',
      },
    })

    // Auto-create chatbot config
    await prisma.chatbotConfig.create({
      data: {
        business_id: business.id,
        tone: 'friendly',
        table_count: 0,
      },
    })

    // Generate tokens
    const access_token = await signAccessToken({
      userId: user.id,
      email: user.email || '',
      businessId: business.id,
    })
    const refresh_token = await signRefreshToken({
      userId: user.id,
      email: user.email || '',
    })

    return NextResponse.json({
      success: true,
      access_token,
      refresh_token,
      token_type: 'Bearer',
      expires_in: 900,
      user: { id: user.id, email: user.email, name: user.name },
      business: { id: business.id, name: business.name },
      needs_setup: true,
    })
  } catch (error) {
    console.error('[jwt/register] Error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
