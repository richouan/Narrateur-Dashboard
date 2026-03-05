import { setAuthCookie, getAuthCookie, clearAuthCookie, verifyToken } from '~~/server/utils/auth'
import { getCookie, deleteCookie } from 'h3'

export default defineEventHandler(async (event) => {
  const ownerToken = getCookie(event, 'lg_owner_token')
  if (!ownerToken) {
    throw createError({ statusCode: 400, statusMessage: 'No impersonation session active' })
  }

  // Verify the saved owner token is still valid
  const payload = verifyToken(ownerToken)
  if (!payload) {
    // Token expired — clear both and force re-login
    clearAuthCookie(event)
    deleteCookie(event, 'lg_owner_token', { path: '/' })
    throw createError({ statusCode: 401, statusMessage: 'Owner session expired, please log in again' })
  }

  // Restore owner session
  setAuthCookie(event, ownerToken)
  deleteCookie(event, 'lg_owner_token', { path: '/' })

  return { success: true }
})
