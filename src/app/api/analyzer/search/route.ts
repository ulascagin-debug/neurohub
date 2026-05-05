export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'

// Zincir/franchise markalar filtresi
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

// Her kategori için kapsamlı arama terimleri listesi
const CAT_QUERIES: Record<string, string[]> = {
  'Restoran': [
    'restoran', 'lokanta', 'yemek', 'restaurant',
    'kebap', 'pide salonu', 'köfte', 'balık restoranı',
    'izgara', 'döner', 'lahmacun', 'et mangal',
  ],
  'Bar/Lounge': [
    'bar', 'lounge', 'pub', 'meyhane', 'gece kulübü',
    'beach bar', 'kokteyl bar', 'bira bahçesi',
  ],
  'Kafe': [
    'kafe', 'cafe', 'kahve', 'kahvaltı', 'kahveci',
    'çay bahçesi', 'pastane kafe', 'nargile kafe',
  ],
  'Kuaför/Berber': [
    'kuaför', 'berber', 'güzellik salonu', 'saç bakım',
    'bayan kuaför', 'erkek kuaför', 'hair salon',
  ],
  'Diş Kliniği': [
    'diş kliniği', 'diş hekimi', 'diş polikliniği',
    'ağız diş sağlığı', 'dental klinik',
  ],
  'Veteriner': [
    'veteriner', 'hayvan hastanesi', 'veteriner kliniği', 'pet klinik',
  ],
  'Spor Salonu': [
    'spor salonu', 'fitness', 'gym', 'spor merkezi',
    'body building', 'pilates', 'yoga',
  ],
  'Spa': [
    'spa', 'masaj salonu', 'hamam', 'güzellik merkezi',
    'masaj', 'wellness', 'sauna',
  ],
  'Otel': [
    'otel', 'pansiyon', 'apart otel', 'butik otel',
    'tatil köyü', 'resort', 'motel', 'hostel',
  ],
  'Eczane': [
    'eczane', 'pharmacy',
  ],
  'Market': [
    'market', 'bakkal', 'manav', 'şarküteri',
    'süpermarket', 'mini market',
  ],
  'Pastane/Fırın': [
    'pastane', 'fırın', 'pasta', 'börek', 'ekmek fırını',
    'simitçi', 'tatlıcı', 'poğaçacı',
  ],
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function searchAnalyzer(
  keyword: string, city: string, district: string, country: string, analyzerUrl: string, secret: string
): Promise<any[]> {
  try {
    const res = await fetch(`${analyzerUrl}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secret}`,
      },
      body: JSON.stringify({ category: keyword, city, district, country, max_businesses: 30 }),
      // @ts-ignore
      signal: AbortSignal.timeout(50000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : (data.businesses || data || [])
  } catch {
    return []
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { category, city, district, country } = body

    if (!category || !city) {
      return NextResponse.json({ error: 'Category and city are required' }, { status: 400 })
    }

    const ANALYZER_URL = process.env.ANALYZER_URL || 'http://neuro-hub.duckdns.org:3001'
    const SECRET = process.env.ANALYZER_SECRET_KEY || ''

    const queries = CAT_QUERIES[category] || [category.toLowerCase()]
    const seen = new Map<string, any>() // name_lower → business

    // Aramaları sırayla çalıştır: önce ilçe düzeyi, sonra şehir düzeyi
    for (const kw of queries) {
      // 1) İlçe düzeyi arama
      if (district) {
        const results = await searchAnalyzer(kw, city, district, country || 'Turkey', ANALYZER_URL, SECRET)
        for (const b of results) {
          const key = (b.name || '').toLowerCase().trim()
          if (key && !isChain(b.name) && !seen.has(key)) seen.set(key, b)
        }
        await sleep(200)
      }

      // Eğer yeterli sonuç varsa (30+) şehir aramasını atla
      if (seen.size >= 30) break

      // 2) Şehir düzeyi arama (ilçe sonuçları yetersizse)
      if (seen.size < 15) {
        const results = await searchAnalyzer(kw, city, '', country || 'Turkey', ANALYZER_URL, SECRET)
        for (const b of results) {
          const key = (b.name || '').toLowerCase().trim()
          if (key && !isChain(b.name) && !seen.has(key)) seen.set(key, b)
        }
        await sleep(200)
      }

      if (seen.size >= 50) break
    }

    const businesses = Array.from(seen.values())
    return NextResponse.json({ businesses })

  } catch (error) {
    console.error('[analyzer/search] Error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
