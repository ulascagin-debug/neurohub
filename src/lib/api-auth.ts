import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { verifyAccessToken, TokenPayload } from './jwt'
import prisma from './prisma'
import { NextResponse } from 'next/server'

export interface AuthenticatedUser {
  id: string
  email: string
}

/**
 * Authenticate a request via NextAuth session OR JWT Bearer token.
 * Returns the authenticated user or null.
 */
export async function authenticateRequest(req: Request): Promise<AuthenticatedUser | null> {
  // 1. Try NextAuth session first
  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    return { id: session.user.id, email: session.user.email || '' }
  }

  // 2. Try JWT Bearer token
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const payload = await verifyAccessToken(token)
    if (payload?.userId) {
      return { id: payload.userId, email: payload.email || '' }
    }
  }

  return null
}

/**
 * Validate that a user has access to a specific business.
 * Checks the UserBusiness table for a valid relationship.
 */
export async function validateBusinessAccess(userId: string, businessId: string): Promise<boolean> {
  const link = await prisma.userBusiness.findUnique({
    where: {
      user_id_business_id: {
        user_id: userId,
        business_id: businessId,
      },
    },
  })
  return !!link
}

/**
 * Require authentication and optionally validate business_id access.
 * Returns user info or an error response.
 */
export async function requireAuth(req: Request, businessId?: string): Promise<
  { success: true; user: AuthenticatedUser } | { success: false; response: NextResponse }
> {
  const user = await authenticateRequest(req)
  if (!user) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Yetkilendirme gerekli. Lütfen giriş yapın.' },
        { status: 401 }
      ),
    }
  }

  if (businessId) {
    const hasAccess = await validateBusinessAccess(user.id, businessId)
    if (!hasAccess) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Bu işletmeye erişim yetkiniz yok.' },
          { status: 403 }
        ),
      }
    }
  }

  return { success: true, user }
}
