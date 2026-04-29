export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const business_id = searchParams.get('business_id')

  if (!business_id) return NextResponse.json({ error: "Missing business_id" }, { status: 400 })

  try {
    const messages = await prisma.message.findMany({ 
      where: { business_id },
      orderBy: { created_at: 'desc' }
    })
    return NextResponse.json({ messages })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}
