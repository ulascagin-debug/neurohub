import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateBody, analyzerTriggerSchema } from '@/lib/validators'

// Parse timeframe sections from the AI markdown report
function parseTimeframeSections(report: string) {
  const sections: { time_1_week: string | null; time_1_month: string | null; time_1_year: string | null } = {
    time_1_week: null,
    time_1_month: null,
    time_1_year: null,
  }

  // Match ### 📅 1 HAFTALIK section
  const weekMatch = report.match(/###\s*📅\s*1\s*HAFTALIK[^\n]*\n([\s\S]*?)(?=###\s*📅|$)/i)
  if (weekMatch) sections.time_1_week = weekMatch[1].trim()

  // Match ### 📅 1 AYLIK section
  const monthMatch = report.match(/###\s*📅\s*1\s*AYLIK[^\n]*\n([\s\S]*?)(?=###\s*📅|$)/i)
  if (monthMatch) sections.time_1_month = monthMatch[1].trim()

  // Match ### 📅 1 YILLIK section
  const yearMatch = report.match(/###\s*📅\s*1\s*YILLIK[^\n]*\n([\s\S]*?)(?=##\s|$)/i)
  if (yearMatch) sections.time_1_year = yearMatch[1].trim()

  return sections
}

// Get JWT token from review-analyzer
async function getAnalyzerToken(analyzerUrl: string): Promise<string> {
  const resp = await fetch(`${analyzerUrl}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: 'dashboard-center' }),
  })

  if (!resp.ok) {
    throw new Error(`Failed to get analyzer token: ${resp.status}`)
  }

  const data = await resp.json()
  return data.token
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Validate input
    const validation = validateBody(analyzerTriggerSchema, body)
    if (!validation.success) return validation.response

    const { business_id } = validation.data

    // Get business info
    const business = await prisma.business.findUnique({ where: { id: business_id } })
    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 })
    }

    const ANALYZER_URL = process.env.ANALYZER_URL || 'http://localhost:5000'

    // Step 1: Get JWT token from review-analyzer
    let token: string
    try {
      token = await getAnalyzerToken(ANALYZER_URL)
    } catch (e) {
      return NextResponse.json({ error: "Could not authenticate with analyzer service" }, { status: 502 })
    }

    // Step 2: Call /analyze with JWT
    const analyzerPayload = {
      business_id,
      category: validation.data.category || business.name,
      country: validation.data.country || 'Turkey',
      city: validation.data.city || business.location?.split(',')[0]?.trim() || 'Istanbul',
      district: validation.data.district || business.location?.split(',')[1]?.trim() || '',
      competitor_urls: validation.data.competitor_urls || [],
      target_business_url: validation.data.target_business_url || null,
    }

    const analyzerResponse = await fetch(`${ANALYZER_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(analyzerPayload),
    })

    if (!analyzerResponse.ok) {
      const err = await analyzerResponse.json()
      return NextResponse.json({ error: err.error || "Analysis failed" }, { status: 500 })
    }

    const analyzerResult = await analyzerResponse.json()
    const fullReport = analyzerResult.result || ''

    // Step 3: Parse timeframe sections from the report
    const timeframes = parseTimeframeSections(fullReport)

    // Step 4: Count competitor weaknesses
    const competitorBadReviews = analyzerResult.stats?.competitor_bad_reviews || []
    const competitorWeaknessCount = Array.isArray(competitorBadReviews) ? competitorBadReviews.length : 0

    // Step 5: Store results in DB
    const analysis = await prisma.reviewAnalysis.upsert({
      where: { business_id },
      update: {
        full_report: fullReport,
        strengths: analyzerResult.stats?.target_good_reviews ? JSON.stringify(analyzerResult.stats.target_good_reviews) : null,
        weaknesses: analyzerResult.stats?.competitor_bad_reviews ? JSON.stringify(analyzerResult.stats.competitor_bad_reviews) : null,
        time_1_week: timeframes.time_1_week,
        time_1_month: timeframes.time_1_month,
        time_1_year: timeframes.time_1_year,
        competitor_weakness_count: competitorWeaknessCount,
        updated_at: new Date(),
      },
      create: {
        business_id,
        full_report: fullReport,
        strengths: analyzerResult.stats?.target_good_reviews ? JSON.stringify(analyzerResult.stats.target_good_reviews) : null,
        weaknesses: analyzerResult.stats?.competitor_bad_reviews ? JSON.stringify(analyzerResult.stats.competitor_bad_reviews) : null,
        time_1_week: timeframes.time_1_week,
        time_1_month: timeframes.time_1_month,
        time_1_year: timeframes.time_1_year,
        competitor_weakness_count: competitorWeaknessCount,
      }
    })

    return NextResponse.json({
      success: true,
      analysis,
      stats: analyzerResult.stats,
      timeframe: analyzerResult.timeframe,
    })
  } catch (error) {
    console.error("[analyzer/trigger] Error:", error)
    return NextResponse.json({ error: "Failed to trigger analysis" }, { status: 500 })
  }
}
