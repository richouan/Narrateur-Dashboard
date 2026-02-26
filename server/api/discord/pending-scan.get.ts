import { requireAuth } from '~~/server/utils/auth'
import { getPendingScanResults } from '~~/server/utils/discord-bot-state'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const results = await getPendingScanResults()

  return { success: true, players: results }
})
