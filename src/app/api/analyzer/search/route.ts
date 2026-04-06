import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { category, city, district, country } = body

    if (!category || !city) {
      return NextResponse.json({ error: 'Category and city are required' }, { status: 400 })
    }

    const ANALYZER_URL = process.env.ANALYZER_URL || 'http://localhost:3001'
    const location = district ? `${city}, ${district}` : city
    const searchResp = await fetch(`${ANALYZER_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ANALYZER_SECRET_KEY}`,
      },
      body: JSON.stringify({
        category: category,
        city: city,
        district: district || '',
        country: country || 'Turkey'
      })
    })

    if (!searchResp.ok) {
      const err = await searchResp.json().catch(() => ({ error: 'Search failed' }))
      return NextResponse.json({ error: err.error || 'Search failed' }, { status: searchResp.status })
    }

    const data = await searchResp.json()
    return NextResponse.json({ businesses: data })
  } catch (error) {
    console.error('[analyzer/search] Error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
