import { NextResponse } from 'next/server'

const ANALYZER_URL = process.env.ANALYZER_URL || 'http://localhost:3001'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      business_name, city, business_type,
      competitor_urls, target_business_url,
      country, district,
    } = body

    if (!business_name || !city || !business_type) {
      return NextResponse.json(
        { error: 'business_name, city ve business_type alanları zorunludur.' },
        { status: 400 }
      )
    }

    const analyzerResp = await fetch(`${ANALYZER_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ANALYZER_SECRET_KEY}`,
      },
      body: JSON.stringify({
        business_name,
        city,
        business_type,
        competitor_urls: competitor_urls || [],
        target_business_url: target_business_url || null,
        country: country || 'Turkey',
        district: district || '',
      }),
      signal: AbortSignal.timeout(300000), // 5 min timeout
    })

    if (!analyzerResp.ok) {
      const err = await analyzerResp.json().catch(() => ({ error: 'Analiz servisi hatası' }))
      return NextResponse.json(
        { error: err.error || err.detail || 'Analiz başarısız oldu' },
        { status: analyzerResp.status }
      )
    }

    const data = await analyzerResp.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('[review-analyzer] Error:', error)

    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Analiz zaman aşımına uğradı. Lütfen tekrar deneyin.' },
        { status: 504 }
      )
    }

    return NextResponse.json(
      { error: 'Analiz servisi şu an kullanılamıyor.' },
      { status: 503 }
    )
  }
}
