export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const platform = searchParams.get('platform')
  const identifier = searchParams.get('identifier')

  if (!platform || !identifier) {
    return NextResponse.json({ error: "Missing platform or identifier" }, { status: 400 })
  }

  try {
    const integration = await prisma.integrationConfig.findUnique({
      where: {
        platform_platform_identifier: {
          platform,
          platform_identifier: identifier,
        },
      },
    })

    if (!integration) {
      return NextResponse.json({ error: "Business not found for this identifier" }, { status: 404 })
    }

    return NextResponse.json({ business_id: integration.business_id })
  } catch (error) {
    console.error("[business-lookup] Error:", error)
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 })
  }
}
