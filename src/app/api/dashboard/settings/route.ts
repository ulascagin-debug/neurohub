export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateBody, settingsSchema } from '@/lib/validators'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const business_id = searchParams.get('business_id')
  if (!business_id) return NextResponse.json({ error: "Missing business_id" }, { status: 400 })

  try {
    const config = await prisma.chatbotConfig.findUnique({ where: { business_id } })
    return NextResponse.json({ config: config || {} })
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Validate input
    const validation = validateBody(settingsSchema, body)
    if (!validation.success) return validation.response

    const { business_id, tone, table_count, menu_pdf_url, campaigns, address } = validation.data

    const config = await prisma.chatbotConfig.upsert({
      where: { business_id },
      update: { tone, table_count: Number(table_count), menu_pdf_url, campaigns, address },
      create: { business_id, tone, table_count: Number(table_count), menu_pdf_url, campaigns, address }
    })
    return NextResponse.json({ success: true, config })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 })
  }
}
