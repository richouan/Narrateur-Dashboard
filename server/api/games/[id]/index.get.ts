import { Game } from '~~/server/models/Game'
import { requireAuth } from '~~/server/utils/auth'
import { getGameForNarrator } from '~~/server/utils/game'

export default defineEventHandler(async (event) => {
  const { userId } = requireAuth(event)

  const id = getRouterParam(event, 'id')
  const game = await getGameForNarrator(event, id!, userId)

  return { success: true, data: game }
})
