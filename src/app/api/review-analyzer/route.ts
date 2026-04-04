import { NextResponse } from 'next/server'

const REVIEW_ANALYZER_URL = process.env.REVIEW_ANALYZER_URL || 'http://localhost:8001'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { business_name, city, business_type } = body

    if (!business_name || !city || !business_type) {
      return NextResponse.json(
        { error: 'business_name, city ve business_type alanları zorunludur.' },
        { status: 400 }
      )
    }

    const analyzerResp = await fetch(`${REVIEW_ANALYZER_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name,
        city,
        business_type,
      }),
      signal: AbortSignal.timeout(300000), // 5 min timeout for long analyses
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
      { error: 'Analiz servisi şu an kullanılamıyor. Lütfen servisin çalıştığından emin olun.' },
      { status: 503 }
    )
  }
}
