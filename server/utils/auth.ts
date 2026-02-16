import jwt from 'jsonwebtoken'
import type { H3Event } from 'h3'
import { getCookie, setCookie, deleteCookie } from 'h3'

interface JWTPayload {
  userId: string
  role: 'ADMIN' | 'NARRATEUR'
}

const COOKIE_NAME = 'lg_auth_token'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export function createToken(payload: JWTPayload): string {
  const config = useRuntimeConfig()
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const config = useRuntimeConfig()
    return jwt.verify(token, config.jwtSecret) as JWTPayload
  } catch {
    return null
  }
}

export function setAuthCookie(event: H3Event, token: string): void {
  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

export function getAuthCookie(event: H3Event): string | undefined {
  return getCookie(event, COOKIE_NAME)
}

export function clearAuthCookie(event: H3Event): void {
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}

export function requireAuth(event: H3Event): JWTPayload {
  const token = getAuthCookie(event)
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const payload = verifyToken(token)
  if (!payload) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid or expired token' })
  }

  return payload
}

export function requireAdmin(event: H3Event): JWTPayload {
  const payload = requireAuth(event)
  if (payload.role !== 'ADMIN') {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }
  return payload
}
