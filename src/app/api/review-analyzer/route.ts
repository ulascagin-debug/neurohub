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
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SECRET_KEY}` }

    const categories = business_type
      ? business_type.split(',').map((s: string) => s.trim()).filter(Boolean)
      : []
    const primaryCategory = categories[0] || business_name
    const categoryStr = categories.join(', ') || primaryCategory

    // ── STEP 1: Search for competitors ──
    console.log(`[analyzer] Searching: "${primaryCategory}" in ${district || city}, ${city}`)

    const searchResp = await fetch(`${ANALYZER_URL}/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ category: primaryCategory, city, district: district || '', country: country || 'Turkey', max_businesses: 15 }),
      // @ts-ignore
      signal: AbortSignal.timeout(120000),
    }).catch((e: any) => { console.warn('[analyzer] Search timeout:', e.message); return null })

    const foundBusinesses: any[] = searchResp?.ok ? (await searchResp.json().catch(() => ({}))).businesses || [] : []
    console.log(`[analyzer] Found ${foundBusinesses.length} businesses`)

    // Identify target vs competitors
    const normalized = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
    const targetNorm = normalized(business_name)
    let targetBusinessUrl = ''
    for (const b of foundBusinesses) {
      const bn = normalized(b.name || '')
      if (bn.includes(targetNorm) || targetNorm.includes(bn)) { targetBusinessUrl = b.url || ''; break }
    }
    const competitorUrls = foundBusinesses.filter((b: any) => b.url && b.url !== targetBusinessUrl).slice(0, 8).map((b: any) => b.url)
    const competitorNames = foundBusinesses.filter((b: any) => b.name && b.url !== targetBusinessUrl).slice(0, 10).map((b: any) => b.name)

    // ── STEP 2a: Try scrape-based analysis ──
    let analysisData: any = null

    if (competitorUrls.length > 0) {
      console.log(`[analyzer] Trying scrape mode for ${competitorUrls.length} competitors`)
      try {
        const analyzeResp = await fetch(`${ANALYZER_URL}/analyze`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            category: categoryStr, city, district: district || '', country: country || 'Turkey',
            target_business_url: targetBusinessUrl || null,
            competitor_urls: competitorUrls,
          }),
          // @ts-ignore
          signal: AbortSignal.timeout(200000),
        })
        if (analyzeResp.ok) {
          const d = await analyzeResp.json().catch(() => null)
          if (d && !d.error) { analysisData = d; console.log('[analyzer] Scrape mode succeeded') }
          else console.warn('[analyzer] Scrape mode returned error:', d?.error)
        }
      } catch (e: any) {
        console.warn('[analyzer] Scrape mode failed:', e.message)
      }
    }

    // ── STEP 2b: Fallback — AI-only mode ──
    if (!analysisData) {
      console.log('[analyzer] Falling back to AI-only mode')
      const prompt = `Bölge: ${district ? district + ', ' : ''}${city}, Türkiye
Sektör: ${categoryStr}
Analiz edilen işletme: ${business_name}
Bölgedeki rakipler: ${competitorNames.length > 0 ? competitorNames.join(', ') : 'Belirsiz'}

Bu işletme için kapsamlı rekabet analizi ve büyüme stratejisi üret. Sektör bilgine dayanarak, bölgede bu tür işletmelerin karşılaştığı tipik sorunları ve fırsatları analiz et.`

      try {
        const fallbackResp = await fetch(`${ANALYZER_URL}/analyze`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ category: categoryStr, city, district: district || '', country: country || 'Turkey', reviews: prompt }),
          // @ts-ignore
          signal: AbortSignal.timeout(60000),
        })
        if (fallbackResp.ok) {
          const d = await fallbackResp.json().catch(() => null)
          if (d && !d.error) { analysisData = d; console.log('[analyzer] AI-only mode succeeded') }
          else console.error('[analyzer] AI-only failed:', d?.error)
        }
      } catch (e: any) {
        console.error('[analyzer] AI-only mode failed:', e.message)
      }
    }

    if (!analysisData) {
      return NextResponse.json({ error: 'Analiz tamamlanamadı. Lütfen birkaç dakika sonra tekrar deneyin.' }, { status: 503 })
    }

    // ── STEP 3: Wrap for UI ──
    const groupKey = categories.length > 1 ? 'Kombine Analiz' : 'Tekli Analiz'
    const subsetKey = categories.length > 0 ? categories.join(' + ') + ' Analizi' : 'Genel Analiz'
    const finalResult = { layered_analysis: { [groupKey]: { [subsetKey]: analysisData } } }

    // ── STEP 4: Save to DB ──
    if (business_id) {
      try {
        await prisma.reviewAnalysis.upsert({
          where: { business_id },
          update: { full_report: JSON.stringify(finalResult), updated_at: new Date() },
          create: { business_id, full_report: JSON.stringify(finalResult) }
        })
        console.log(`[analyzer] Saved analysis for business ${business_id}`)
      } catch (dbErr) {
        console.error('[analyzer] DB save failed:', dbErr)
      }
    }

    return NextResponse.json(finalResult)

  } catch (error: any) {
    console.error('[analyzer] Pipeline error:', error)
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      return NextResponse.json({ error: 'Analiz süresi aşıldı. Lütfen tekrar deneyin.' }, { status: 504 })
    }
    return NextResponse.json({ error: error.message || 'Bilinmeyen hata' }, { status: 500 })
  }
}
