import { NextResponse } from 'next/server'

export const maxDuration = 300 // 5 minutes timeout

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { business_name, city, business_type, district, country } = body

    const ANALYZER_URL = process.env.ANALYZER_URL || 'http://localhost:3001'
    const SECRET_KEY = process.env.ANALYZER_SECRET_KEY || ''
    const location = district ? `${district}, ${city}` : city

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SECRET_KEY}`
    }

    // --- STEP 1: Search for real competitors ---
    const searchResponse = await fetch(`${ANALYZER_URL}/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        category: business_type ? `${business_name} ${business_type}`.trim() : business_name,
        city: location,
        country: country || 'Turkey'
      }),
    })

    if (!searchResponse.ok) {
      const errText = await searchResponse.text()
      console.error("[review-analyzer] Search step failed:", errText)
      return NextResponse.json({ error: `Rakip arama başarısız: ${searchResponse.status}` }, { status: searchResponse.status })
    }

    const startData = await searchResponse.json()
    const foundBusinesses = startData.businesses || []

    if (foundBusinesses.length === 0) {
      return NextResponse.json({ error: "Bölgede yeterli rakip bulunamadı." }, { status: 404 })
    }

    // Try to find the target business URL from search results
    let targetBusinessUrl = ""
    const normalizedTargetName = business_name.toLowerCase().replace(/[^a-z0-9]/g, '')
    
    for (const b of foundBusinesses) {
      const bName = (b.name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
      if (bName.includes(normalizedTargetName) || normalizedTargetName.includes(bName)) {
         targetBusinessUrl = b.url || ""
         break
      }
    }

    // Get up to top 5 competitors that are NOT the target business
    const competitorUrls = foundBusinesses
      .filter((b: any) => b.url !== targetBusinessUrl && b.url != null)
      .slice(0, 5)
      .map((b: any) => b.url)

    if (competitorUrls.length === 0) {
       return NextResponse.json({ error: "Rakip URL'leri çıkarılamadı." }, { status: 404 })
    }

    // --- STEP 2: Deep Analysis ---
    const analyzeResponse = await fetch(`${ANALYZER_URL}/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        category: business_type || '',
        city: city,
        district: district || '',
        country: country || 'Turkey',
        target_business_url: targetBusinessUrl || null,
        competitor_urls: competitorUrls
      }),
    })

    if (!analyzeResponse.ok) {
      const errText = await analyzeResponse.text()
      console.error("[review-analyzer] Analyze step failed:", errText)
      return NextResponse.json({ error: `Analiz başarısız: ${analyzeResponse.status}` }, { status: analyzeResponse.status })
    }

    const analysisResult = await analyzeResponse.json()
    return NextResponse.json(analysisResult)

  } catch (error: any) {
    console.error("[review-analyzer] Overall pipeline failed:", error)
    return NextResponse.json({ error: error.message || 'Bilinmeyen bir hata oluştu' }, { status: 500 })
  }
}
