import { Game } from '~~/server/models/Game'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const games = await Game.find().sort({ createdAt: -1 }).limit(20)

  return { success: true, data: games }
})
