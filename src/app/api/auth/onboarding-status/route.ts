export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { onboarding_completed: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[onboarding-complete] Error:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { onboarding_completed: true, plan: true },
    })

    return NextResponse.json({
      onboarding_completed: user?.onboarding_completed ?? true,
      plan: user?.plan ?? 'free',
    })
  } catch (error) {
    return NextResponse.json({ onboarding_completed: true, plan: 'free' })
  }
}
