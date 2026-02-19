import { Game } from '~~/server/models/Game'
import { requireAuth } from '~~/server/utils/auth'
import { getGameForNarrator } from '~~/server/utils/game'
import { broadcastGameUpdate } from '~~/server/utils/websocket'
import { retryOnVersionConflict } from '~~/server/utils/retry'

export default defineEventHandler(async (event) => {
  const { userId } = requireAuth(event)

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { manualRoleAssignments } = body // Object of { playerId: boolean }

  if (typeof manualRoleAssignments !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'manualRoleAssignments object required' })
  }

  return await retryOnVersionConflict(async () => {
    const game = await getGameForNarrator(event, id!, userId)

    game.manualRoleAssignments = manualRoleAssignments

    await game.save()
    broadcastGameUpdate(game)

    return { success: true, data: game }
  })
})
