import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || ''

// Verify cron secret for security
function verifyCronAuth(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return true // Allow if no secret configured (dev mode)

  const auth = req.headers.get('authorization')
  if (auth === `Bearer ${cronSecret}`) return true

  // Vercel cron sends this header
  const vercelCron = req.headers.get('x-vercel-cron')
  if (vercelCron) return true

  return false
}

// Fetch Google Places details for a place_id
async function fetchPlaceDetails(placeId: string): Promise<{
  rating: number | null
  review_count: number | null
  reviews: any[]
} | null> {
  if (!GOOGLE_PLACES_API_KEY) return null

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,user_ratings_total,reviews&language=tr&key=${GOOGLE_PLACES_API_KEY}`
    const resp = await fetch(url, { next: { revalidate: 0 } })
    const data = await resp.json()

    if (data.status !== 'OK' || !data.result) return null

    return {
      rating: data.result.rating ?? null,
      review_count: data.result.user_ratings_total ?? null,
      reviews: data.result.reviews || [],
    }
  } catch (error) {
    console.error(`[cron] Places API error for ${placeId}:`, error)
    return null
  }
}

export async function GET(req: Request) {
  // Auth check
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const results = { businesses: 0, competitors: 0, snapshots: 0, errors: 0 }

  try {
    // 1. Get all businesses with place_id
    const businesses = await prisma.business.findMany({
      where: { place_id: { not: null } },
      include: { competitors: true },
    })

    for (const business of businesses) {
      // 2. Fetch own business data
      if (business.place_id) {
        try {
          const details = await fetchPlaceDetails(business.place_id)
          if (details) {
            // Update business rating
            await prisma.business.update({
              where: { id: business.id },
              data: {
                maps_rating: details.rating,
                maps_review_count: details.review_count,
              },
            })

            // Create snapshot
            await prisma.reviewSnapshot.create({
              data: {
                business_id: business.id,
                source: 'own',
                place_id: business.place_id,
                business_name: business.name,
                rating: details.rating,
                review_count: details.review_count,
                reviews_json: details.reviews.length > 0 ? JSON.stringify(details.reviews.slice(0, 5)) : null,
              },
            })

            results.businesses++
            results.snapshots++
          }
        } catch (err) {
          console.error(`[cron] Error processing business ${business.id}:`, err)
          results.errors++
        }
      }

      // 3. Fetch competitor data
      for (const competitor of business.competitors) {
        try {
          const details = await fetchPlaceDetails(competitor.place_id)
          if (details) {
            // Update competitor rating
            await prisma.competitorBusiness.update({
              where: { id: competitor.id },
              data: {
                rating: details.rating,
                review_count: details.review_count,
              },
            })

            // Create snapshot
            await prisma.reviewSnapshot.create({
              data: {
                business_id: business.id,
                source: 'competitor',
                place_id: competitor.place_id,
                business_name: competitor.name,
                rating: details.rating,
                review_count: details.review_count,
                reviews_json: details.reviews.length > 0 ? JSON.stringify(details.reviews.slice(0, 5)) : null,
              },
            })

            results.competitors++
            results.snapshots++
          }
        } catch (err) {
          console.error(`[cron] Error processing competitor ${competitor.id}:`, err)
          results.errors++
        }
      }
    }

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      duration_ms: duration,
      ...results,
      message: `Synced ${results.businesses} businesses and ${results.competitors} competitors. Created ${results.snapshots} snapshots. ${results.errors} errors.`,
    })
  } catch (error) {
    console.error('[cron/review-sync] Fatal error:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
