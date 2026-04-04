import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateBody, chatbotReservationSchema } from '@/lib/validators'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Validate input
    const validation = validateBody(chatbotReservationSchema, body)
    if (!validation.success) return validation.response

    const { business_id, customer_name, date, time, party_size } = validation.data

    const reservation = await prisma.reservation.create({
      data: { business_id, customer_name, date, time, party_size }
    })
    return NextResponse.json({ success: true, reservation })
  } catch (error) {
    return NextResponse.json({ error: "Failed to store reservation" }, { status: 500 })
  }
}
