import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { query, location } = body

    if (!query || !location) {
      return NextResponse.json({ error: 'query and location are required' }, { status: 400 })
    }

    const ANALYZER_URL = process.env.ANALYZER_URL || 'http://localhost:3001'
    const params = new URLSearchParams({ query, location })

    const searchResp = await fetch(`${ANALYZER_URL}/api/search-place?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.ANALYZER_SECRET_KEY}`,
      },
    })

    if (!searchResp.ok) {
      const err = await searchResp.json().catch(() => ({ error: 'Search failed' }))
      return NextResponse.json({ error: err.error || 'Search failed' }, { status: searchResp.status })
    }

    const data = await searchResp.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[competitors/search] Error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
