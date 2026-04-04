import { SignJWT, jwtVerify, JWTPayload } from 'jose'

const getSecret = () => {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-dev-secret'
  return new TextEncoder().encode(secret)
}

export interface TokenPayload extends JWTPayload {
  userId: string
  email: string
  businessId?: string
}

export async function signAccessToken(payload: { userId: string; email: string; businessId?: string }): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .setSubject(payload.userId)
    .sign(getSecret())
}

export async function signRefreshToken(payload: { userId: string; email: string }): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .setSubject(payload.userId)
    .sign(getSecret())
}

export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as TokenPayload
  } catch {
    return null
  }
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as TokenPayload
  } catch {
    return null
  }
}
