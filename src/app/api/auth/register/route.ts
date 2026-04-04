import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcrypt'
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
        plan: 'free',
        onboarding_completed: false,
      },
    })

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
      needs_setup: true,
    })
  } catch (error) {
    console.error('[register] Error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
