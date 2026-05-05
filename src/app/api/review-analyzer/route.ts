export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const maxDuration = 300 // 5 minutes timeout

const generateSubsets = (array: string[]): string[][] => {
  const result: string[][] = [];
  const n = array.length;
  for (let i = 1; i < (1 << n); i++) {
    const subset: string[] = [];
    for (let j = 0; j < n; j++) {
      if (i & (1 << j)) {
        subset.push(array[j]);
      }
    }
    result.push(subset);
  }
  return result;
}

const chunkArray = <T>(arr: T[], size: number): T[][] => {
  return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );
}

const getGroupName = (subsetSize: number, totalSize: number) => {
  if (subsetSize === totalSize && totalSize > 1) return "Tam Eşleşme";
  if (subsetSize === 1) return "Tekli Analiz";
  if (subsetSize === 2) return "İkili Analiz";
  if (subsetSize === 3) return "Üçlü Analiz";
  if (subsetSize === 4) return "Dörtlü Analiz";
  return "Tam Eşleşme";
}

const getSubsetName = (subset: string[], totalSize: number) => {
  if (subset.length === totalSize && totalSize > 1) {
    return `${subset.join(' + ')} olanlar`;
  }
  return `Sadece ${subset.join(' + ')} olanlar`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { business_id, business_name, city, business_type, district, country } = body

    const ANALYZER_URL = process.env.ANALYZER_URL || 'http://neuro-hub.duckdns.org:3001'
    const SECRET_KEY = process.env.ANALYZER_SECRET_KEY || 'nH7$xK2@mP9!qR4vL8&wZ3jE'
    const location = district ? `${district}, ${city}` : city

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SECRET_KEY}`
    }

    const categories = business_type ? business_type.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    
    // If no specific categories, fallback to purely business name based single search
    if (categories.length === 0) {
      categories.push("");
    }

    // Limit to max 5 to prevent more than 31 combinations
    const limitedCategories = categories.slice(0, 5);
    const subsets = generateSubsets(limitedCategories);

    const layeredResults: any = {
      "Tekli Analiz": {},
      "İkili Analiz": {},
      "Üçlü Analiz": {},
      "Dörtlü Analiz": {},
      "Tam Eşleşme": {}
    };

    const processSubset = async (subset: string[]) => {
      const subsetString = subset.join(', ');
      
      // --- STEP 1: Search for real competitors ---
      // Use ONLY the category (not business name) to find competitors in the area
      const searchCategory = subsetString || business_name;
      
      const searchResponse = await fetch(`${ANALYZER_URL}/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          category: searchCategory,
          city,
          district: district || '',
          country: country || 'Turkey',
          max_businesses: 20,
        }),
      })

      if (!searchResponse.ok) return null;

      const startData = await searchResponse.json()
      const foundBusinesses = startData.businesses || []

      if (foundBusinesses.length === 0) return null;

      let targetBusinessUrl = ""
      const normalizedTargetName = business_name.toLowerCase().replace(/[^a-z0-9]/g, '')
      
      for (const b of foundBusinesses) {
        const bName = (b.name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        if (bName.includes(normalizedTargetName) || normalizedTargetName.includes(bName)) {
           targetBusinessUrl = b.url || ""
           break
        }
      }

      const competitorUrls = foundBusinesses
        .filter((b: any) => b.url !== targetBusinessUrl && b.url != null)
        .slice(0, 5)
        .map((b: any) => b.url)

      if (competitorUrls.length === 0) return null;

      // --- STEP 2: Deep Analysis ---
      const analyzeResponse = await fetch(`${ANALYZER_URL}/analyze`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          category: subsetString,
          city: city,
          district: district || '',
          country: country || 'Turkey',
          target_business_url: targetBusinessUrl || null,
          competitor_urls: competitorUrls
        }),
      })

      if (!analyzeResponse.ok) return null;

      return await analyzeResponse.json();
    };

    // Run combinations in chunks of 3 to avoid crashing python server
    const chunks = chunkArray(subsets, 3);
    
    // We'll track at least one success
    let anySuccess = false;

    for (const chunk of chunks) {
      const promises = chunk.map(async (subset) => {
        try {
          const result = await processSubset(subset);
          if (result) {
            const groupName = getGroupName(subset.length, limitedCategories.length);
            const subsetName = getSubsetName(subset, limitedCategories.length);
            
            if (!layeredResults[groupName]) {
              layeredResults[groupName] = {};
            }
            layeredResults[groupName][subsetName] = result;
            anySuccess = true;
          }
        } catch (err) {
          console.error(`Failed to process subset: ${subset.join(', ')}`, err);
        }
      });

      await Promise.all(promises);
    }

    if (!anySuccess) {
       return NextResponse.json({ error: "Hiçbir kombinasyon için yeterli rakip/analiz bulunamadı." }, { status: 404 })
    }

    // Clean up empty objects
    const finalResponse: any = {};
    for (const key of Object.keys(layeredResults)) {
      if (Object.keys(layeredResults[key]).length > 0) {
        finalResponse[key] = layeredResults[key];
      }
    }

    // Auto-save to DB if business_id provided
    if (business_id) {
      try {
        await prisma.reviewAnalysis.upsert({
          where: { business_id },
          update: { full_report: JSON.stringify({ layered_analysis: finalResponse }), updated_at: new Date() },
          create: { business_id, full_report: JSON.stringify({ layered_analysis: finalResponse }) }
        })
      } catch (saveErr) {
        console.error('[review-analyzer] DB save failed:', saveErr)
      }
    }

    return NextResponse.json({
      layered_analysis: finalResponse
    })

  } catch (error: any) {
    console.error("[review-analyzer] Overall pipeline failed:", error)
    return NextResponse.json({ error: error.message || 'Bilinmeyen bir hata oluştu' }, { status: 500 })
  }
}
