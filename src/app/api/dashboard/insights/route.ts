import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const business_id = searchParams.get('business_id')
  if (!business_id) return NextResponse.json({ error: "Missing business_id" }, { status: 400 })

  try {
    const analysis = await prisma.reviewAnalysis.findUnique({ where: { business_id } })
    return NextResponse.json({ analysis: analysis || null })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch analysis" }, { status: 500 })
  }
}
