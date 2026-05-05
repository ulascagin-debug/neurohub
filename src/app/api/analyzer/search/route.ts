export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'

// Zincir/franchise markalar — yerel işletme değiller, filtrele
const CHAIN_BRANDS = [
  'burger king', 'mcdonald', 'kfc', 'popeyes', 'pizza hut', "domino's", 'dominos',
  'subway', 'starbucks', 'costa coffee', 'gloria jeans', 'caribou coffee',
  'mado', 'simit sarayı', 'simit saraylari', 'saray muhallebicisi',
  'migros', 'carrefour', 'carrefoursa', 'şok market', 'a101', 'bim market',
  'teknosa', 'mediamarkt', 'vatan bilgisayar',
  'little caesars', 'papa johns', 'nando', 'arby',
]

function isChain(name: string): boolean {
  const lower = name.toLowerCase()
  return CHAIN_BRANDS.some(b => lower.includes(b))
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { category, city, district, country } = body

    if (!category || !city) {
      return NextResponse.json({ error: 'Category and city are required' }, { status: 400 })
    }

    const ANALYZER_URL = process.env.ANALYZER_URL || 'http://neuro-hub.duckdns.org:3001'

    const searchResp = await fetch(`${ANALYZER_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ANALYZER_SECRET_KEY}`,
      },
      body: JSON.stringify({
        category,
        city,
        district: district || '',
        country: country || 'Turkey',
        max_businesses: 40,
      }),
      // @ts-ignore
      signal: AbortSignal.timeout(55000),
    })

    if (!searchResp.ok) {
      const err = await searchResp.json().catch(() => ({ error: 'Search failed' }))
      return NextResponse.json({ error: err.error || 'Search failed' }, { status: searchResp.status })
    }

    const data = await searchResp.json()

    // data may be array or { businesses: [] }
    const rawList: any[] = Array.isArray(data) ? data : (data.businesses || data)

    // Filter out chains, keep only local businesses
    const filtered = rawList.filter(b => b.name && !isChain(b.name))

    return NextResponse.json({ businesses: filtered })
  } catch (error) {
    console.error('[analyzer/search] Error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
