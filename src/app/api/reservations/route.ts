import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateBody, reservationSchema } from '@/lib/validators'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Validate input
    const validation = validateBody(reservationSchema, body)
    if (!validation.success) return validation.response

    const data = validation.data

    // cafe-chatbot sends: business_id, customer_name, customer_id, date, time, party_size, notes
    const reservation = await prisma.reservation.create({
      data: {
        business_id: data.business_id,
        customer_name: data.customer_name || 'Misafir',
        date: data.date,
        time: data.time,
        party_size: data.party_size,
      }
    })
    return NextResponse.json({ success: true, reservation }, { status: 201 })
  } catch (error) {
    console.error("[reservations] Error:", error)
    return NextResponse.json({ error: "Failed to create reservation" }, { status: 500 })
  }
}
