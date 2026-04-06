import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { business_name, city, business_type, district, country } = body

    const ANALYZER_URL = process.env.ANALYZER_URL || 'http://localhost:3001'
    const location = district ? `${district}, ${city}` : city

    const resp = await fetch(`${ANALYZER_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ANALYZER_SECRET_KEY}`,
      },
      body: JSON.stringify({
        business_name,
        location,
        business_type,
        country: country || 'Turkey',
      }),
    })

    if (!resp.ok) {
      const errText = await resp.text()
      console.error('[review-analyzer] FastAPI error:', resp.status, errText)
      return NextResponse.json({ error: errText }, { status: resp.status })
    }

    const data = await resp.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('[review-analyzer] Exception:', error)
    return NextResponse.json({ error: error.message || 'Analiz servisi hatası' }, { status: 500 })
  }
}
