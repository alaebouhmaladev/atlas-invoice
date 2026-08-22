import { getCookie, setCookie, deleteCookie, createError, type H3Event } from 'h3'
import type { Role } from '@prisma/client'
import { validateSessionToken } from '../services/auth.service'
import type { UserPublic } from '~/types/auth'

export const SESSION_COOKIE_NAME = 'session'

export function getSessionTokenCookie(event: H3Event): string | undefined {
  return getCookie(event, SESSION_COOKIE_NAME)
}

export function setSessionTokenCookie(event: H3Event, token: string, maxAgeInSeconds: number): void {
  const isProduction = process.env.NODE_ENV === 'production'

  setCookie(event, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    maxAge: maxAgeInSeconds
  })
}

export function deleteSessionTokenCookie(event: H3Event): void {
  const isProduction = process.env.NODE_ENV === 'production'

  deleteCookie(event, SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/'
  })
}

export async function getUserFromEvent(event: H3Event): Promise<UserPublic | null> {
  if (event.context.user !== undefined) {
    return event.context.user
  }

  const token = getSessionTokenCookie(event)
  if (!token) {
    event.context.user = null
    return null
  }

  const authData = await validateSessionToken(token)
  if (!authData) {
    deleteSessionTokenCookie(event)
    event.context.user = null
    return null
  }

  event.context.user = authData.user
  event.context.session = authData.session
  return authData.user
}

export async function requireAuth(event: H3Event): Promise<UserPublic> {
  const user = await getUserFromEvent(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentification requise',
      data: {
        code: 'UNAUTHORIZED',
        message: 'Vous devez être authentifié pour accéder à cette ressource'
      }
    })
  }
  return user
}

export async function requireRole(event: H3Event, ...allowedRoles: Role[]): Promise<UserPublic> {
  const user = await requireAuth(event)
  if (!allowedRoles.includes(user.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Accès interdit',
      data: {
        code: 'FORBIDDEN',
        message: 'Vous ne disposez pas des droits nécessaires pour effectuer cette action'
      }
    })
  }
  return user
}

export async function requireSuperAdmin(event: H3Event): Promise<UserPublic> {
  return requireRole(event, 'SUPER_ADMIN')
}
