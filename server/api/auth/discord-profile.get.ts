import { requireAuth } from '~~/server/utils/auth'
import { getCachedTargetProfile } from '~~/server/utils/discord-bot-state'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const profile = getCachedTargetProfile()
  return { success: true, data: profile }
})
