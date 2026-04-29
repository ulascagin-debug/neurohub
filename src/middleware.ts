import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// ── In-Memory Rate Limiter ──
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000  // 1 minute
const RATE_LIMIT_MAX = 60               // 60 requests per window

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetIn: RATE_LIMIT_WINDOW_MS }
  }

  entry.count++
  const remaining = Math.max(0, RATE_LIMIT_MAX - entry.count)
  const resetIn = entry.resetTime - now

  if (entry.count > RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetIn }
  }

  return { allowed: true, remaining, resetIn }
}

// Cleanup stale entries periodically
function cleanupStaleEntries() {
  const now = Date.now()
  const keys = Array.from(rateLimitMap.keys())
  for (let i = 0; i < keys.length; i++) {
    const entry = rateLimitMap.get(keys[i])
    if (entry && now > entry.resetTime) {
      rateLimitMap.delete(keys[i])
    }
  }
}

// ── Security Headers (Helmet.js equivalent) ──
const securityHeaders: [string, string][] = [
  ['X-Content-Type-Options', 'nosniff'],
  ['X-Frame-Options', 'DENY'],
  ['X-XSS-Protection', '1; mode=block'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['Permissions-Policy', 'camera=(), microphone=(), geolocation=()'],
  ['X-DNS-Prefetch-Control', 'off'],
  ['X-Download-Options', 'noopen'],
  ['X-Permitted-Cross-Domain-Policies', 'none'],
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl


  // ── API-specific: Rate limiting & security headers ──
  if (pathname.startsWith('/api/')) {
    // Periodic cleanup (every ~100 requests)
    if (rateLimitMap.size > 100) {
      cleanupStaleEntries()
    }

    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ip = (forwarded ? forwarded.split(',')[0].trim() : null)
      || realIp
      || '127.0.0.1'

    // ── Rate Limiting ──
    const { allowed, remaining, resetIn } = checkRateLimit(ip)

    if (!allowed) {
      const response = NextResponse.json(
        { error: 'Çok fazla istek. Lütfen bir dakika bekleyin.' },
        { status: 429 }
      )
      response.headers.set('Retry-After', String(Math.ceil(resetIn / 1000)))
      response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX))
      response.headers.set('X-RateLimit-Remaining', '0')
      response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetIn / 1000)))

      // Add security headers to 429 response too
      for (let i = 0; i < securityHeaders.length; i++) {
        response.headers.set(securityHeaders[i][0], securityHeaders[i][1])
      }

      return response
    }

    // ── Continue with security headers ──
    const response = NextResponse.next()

    // Rate limit headers
    response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX))
    response.headers.set('X-RateLimit-Remaining', String(remaining))
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetIn / 1000)))

    // Security headers
    for (let i = 0; i < securityHeaders.length; i++) {
      response.headers.set(securityHeaders[i][0], securityHeaders[i][1])
    }

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
