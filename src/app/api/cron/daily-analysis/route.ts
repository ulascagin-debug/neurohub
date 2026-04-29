export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// This endpoint should be called by a cron job (e.g. GitHub Actions, Vercel Cron, or a simple external scheduler)
export async function GET(req: Request) {
  // Check authorization headers if needed for security
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Fetch all top 3 competitors from all businesses (or grouped by business)
    const topCompetitors = await prisma.competitorBusiness.findMany({
      where: { is_top3: true },
      include: { business: true }
    })

    if (topCompetitors.length === 0) {
      return NextResponse.json({ message: 'No top competitors to analyze.' })
    }

    // Process each asynchronously. In a real environment with many businesses, 
    // you might want to use a queue (SQS, BullMQ, etc.)
    const results = []

    for (const comp of topCompetitors) {
      if (!comp.place_id && !comp.address) continue; // Not enough info to scrape

      results.push({ id: comp.id, name: comp.name, status: 'queued for next processing phase' })
      // Here you would trigger the `FASTAPI_URL/analyze` endpoint for this specific competitor
      // Similar to how we do it in `/api/review-analyzer/route.ts`
      // Since this can take 5+ minutes per competitor, it shouldn't hold the HTTP request open.
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Daily analysis triggered',
      tasks: results 
    })

  } catch (error) {
    console.error("[cron] Error running daily analysis:", error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
