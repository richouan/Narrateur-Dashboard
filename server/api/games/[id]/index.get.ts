import { Game } from '~~/server/models/Game'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const id = getRouterParam(event, 'id')
  const game = await Game.findById(id)

  if (!game) {
    throw createError({ statusCode: 404, statusMessage: 'Game not found' })
  }

  return { success: true, data: game }
})
