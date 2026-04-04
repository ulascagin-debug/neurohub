import { NextResponse } from 'next/server'

// Get JWT token from review-analyzer
async function getAnalyzerToken(analyzerUrl: string): Promise<string> {
  const resp = await fetch(`${analyzerUrl}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: 'dashboard-center' }),
  })
  if (!resp.ok) throw new Error(`Token failed: ${resp.status}`)
  const data = await resp.json()
  return data.token
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { category, city, district, country } = body

    if (!category || !city) {
      return NextResponse.json({ error: 'Category and city are required' }, { status: 400 })
    }

    const ANALYZER_URL = process.env.ANALYZER_URL || 'http://localhost:5000'

    // Get JWT token
    let token: string
    try {
      token = await getAnalyzerToken(ANALYZER_URL)
    } catch (e) {
      return NextResponse.json({ error: 'Could not authenticate with analyzer' }, { status: 502 })
    }

    // Call /search on review-analyzer
    const searchResp = await fetch(`${ANALYZER_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ category, city, district, country: country || 'Turkey' }),
    })

    if (!searchResp.ok) {
      const err = await searchResp.json().catch(() => ({ error: 'Search failed' }))
      return NextResponse.json({ error: err.error || 'Search failed' }, { status: searchResp.status })
    }

    const data = await searchResp.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[analyzer/search] Error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
