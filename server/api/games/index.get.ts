import { Game } from '~~/server/models/Game'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const { userId } = requireAuth(event)

  // Only show games created by this narrator
  const games = await Game.find({ narratorId: userId })
    .sort({ createdAt: -1 })
    .limit(20)

  return { success: true, data: games }
})
