import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateBody, analysisSchema } from '@/lib/validators'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('business_id')

  if (!businessId) {
    return NextResponse.json({ error: 'business_id gerekli' }, { status: 400 })
  }

  try {
    const analysis = await prisma.reviewAnalysis.findUnique({
      where: { business_id: businessId },
    })
    return NextResponse.json({ analysis })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch analysis' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Validate input
    const validation = validateBody(analysisSchema, body)
    if (!validation.success) return validation.response

    const { business_id, strengths, weaknesses, competitors, suggestions } = validation.data
    
    const analysis = await prisma.reviewAnalysis.upsert({
      where: { business_id },
      update: { strengths, weaknesses, competitors, suggestions },
      create: { business_id, strengths, weaknesses, competitors, suggestions }
    })
    return NextResponse.json({ success: true, analysis })
  } catch (error) {
    return NextResponse.json({ error: "Failed to store analysis" }, { status: 500 })
  }
}
