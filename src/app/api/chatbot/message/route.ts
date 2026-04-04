import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateBody, chatbotMessageSchema } from '@/lib/validators'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Validate input
    const validation = validateBody(chatbotMessageSchema, body)
    if (!validation.success) return validation.response

    const { business_id, platform, content, response } = validation.data

    const message = await prisma.message.create({
      data: { business_id, platform, content, response }
    })
    return NextResponse.json({ success: true, message })
  } catch (error) {
    return NextResponse.json({ error: "Failed to store message" }, { status: 500 })
  }
}
