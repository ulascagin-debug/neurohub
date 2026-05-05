export const dynamic = 'force-dynamic';
export const maxDuration = 300;
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { business_id, business_name, city, business_type, district, country } = body

    if (!business_name || !city) {
      return NextResponse.json({ error: 'business_name ve city gerekli' }, { status: 400 })
    }

    const ANALYZER_URL = process.env.ANALYZER_URL || 'http://neuro-hub.duckdns.org:3001'
    const SECRET_KEY = process.env.ANALYZER_SECRET_KEY || 'nH7$xK2@mP9!qR4vL8&wZ3jE'
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SECRET_KEY}`
    }

    const categories = business_type
      ? business_type.split(',').map((s: string) => s.trim()).filter(Boolean)
      : []
    const primaryCategory = categories[0] || business_name

    // ── STEP 1: ONE search call to find competitors ──
    console.log(`[review-analyzer] Searching: ${primaryCategory} in ${district}, ${city}`)
    const searchResp = await fetch(`${ANALYZER_URL}/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        category: primaryCategory,
        city,
        district: district || '',
        country: country || 'Turkey',
        max_businesses: 15,
      }),
      // @ts-ignore
      signal: AbortSignal.timeout(120000), // 2 min max
    })

    if (!searchResp.ok) {
      const err = await searchResp.json().catch(() => ({}))
      return NextResponse.json({ error: err.error || 'İşletme araması başarısız' }, { status: 502 })
    }

    const searchData = await searchResp.json()
    const foundBusinesses: any[] = searchData.businesses || []
    console.log(`[review-analyzer] Found ${foundBusinesses.length} businesses`)

    if (foundBusinesses.length === 0) {
      return NextResponse.json({ error: 'Bu bölgede rakip işletme bulunamadı.' }, { status: 404 })
    }

    // Find target business URL (exclude from competitor list)
    const normalized = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
    const targetNorm = normalized(business_name)
    let targetBusinessUrl = ''
    for (const b of foundBusinesses) {
      const bn = normalized(b.name || '')
      if (bn.includes(targetNorm) || targetNorm.includes(bn)) {
        targetBusinessUrl = b.url || ''
        break
      }
    }

    const competitorUrls = foundBusinesses
      .filter((b: any) => b.url && b.url !== targetBusinessUrl)
      .slice(0, 8)
      .map((b: any) => b.url)

    if (competitorUrls.length === 0) {
      return NextResponse.json({ error: 'Rakip işletme bulunamadı (yalnızca kendi işletmeniz listelendi).' }, { status: 404 })
    }

    // ── STEP 2: ONE analyze call for all categories ──
    const categoryStr = categories.join(', ') || primaryCategory
    console.log(`[review-analyzer] Analyzing ${competitorUrls.length} competitors for: ${categoryStr}`)

    const analyzeResp = await fetch(`${ANALYZER_URL}/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        category: categoryStr,
        city,
        district: district || '',
        country: country || 'Turkey',
        target_business_url: targetBusinessUrl || null,
        competitor_urls: competitorUrls,
      }),
      // @ts-ignore
      signal: AbortSignal.timeout(240000), // 4 min max
    })

    if (!analyzeResp.ok) {
      const err = await analyzeResp.json().catch(() => ({}))
      return NextResponse.json({ error: err.error || 'Analiz başarısız' }, { status: 502 })
    }

    const analysisData = await analyzeResp.json()

    if (analysisData.error) {
      console.error('[review-analyzer] Analyzer error:', analysisData.error)
      return NextResponse.json({ error: analysisData.error }, { status: 422 })
    }

    // ── STEP 3: Wrap in layered_analysis format for UI ──
    const groupKey = categories.length > 1 ? 'Kombine Analiz' : 'Tekli Analiz'
    const subsetKey = categories.length > 0 ? categories.join(' + ') + ' Analizi' : 'Genel Analiz'

    const finalResult = {
      layered_analysis: {
        [groupKey]: {
          [subsetKey]: analysisData
        }
      }
    }

    // ── STEP 4: Save to DB ──
    if (business_id) {
      try {
        await prisma.reviewAnalysis.upsert({
          where: { business_id },
          update: { full_report: JSON.stringify(finalResult), updated_at: new Date() },
          create: { business_id, full_report: JSON.stringify(finalResult) }
        })
        console.log(`[review-analyzer] Saved analysis for business ${business_id}`)
      } catch (dbErr) {
        console.error('[review-analyzer] DB save failed:', dbErr)
      }
    }

    return NextResponse.json(finalResult)

  } catch (error: any) {
    console.error('[review-analyzer] Pipeline error:', error)
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      return NextResponse.json({ error: 'Analiz süresi aşıldı. Lütfen tekrar deneyin.' }, { status: 504 })
    }
    return NextResponse.json({ error: error.message || 'Bilinmeyen hata' }, { status: 500 })
  }
}
