import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const business_id = searchParams.get('business_id')

  if (!business_id) {
    return NextResponse.json({ error: "Missing business_id" }, { status: 400 })
  }

  try {
    const reservations = await prisma.reservation.findMany({ where: { business_id } })
    const messages = await prisma.message.count({ where: { business_id } })

    const reservationsCount = reservations.length
    const conversionRate = messages > 0 ? Math.round((reservationsCount / messages) * 100) : 0;

    // A very simple forecast logic
    // We assume the coming week is 1.1x the current reservations, rounded
    const predictedNextWeek = Math.round(reservationsCount * 1.1)

    return NextResponse.json({
      reservationsCount,
      messagesCount: messages,
      conversionRate,
      predictedNextWeek
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 })
  }
}
