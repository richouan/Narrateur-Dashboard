import { Game } from '~~/server/models/Game'
import { requireAuth } from '~~/server/utils/auth'
import { getGameForNarrator } from '~~/server/utils/game'
import { broadcastGameUpdate } from '~~/server/utils/websocket'
import { retryOnVersionConflict } from '~~/server/utils/retry'

export default defineEventHandler(async (event) => {
  const { userId } = requireAuth(event)

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { selectedRoles } = body // Object of { roleId: quantity }

  if (typeof selectedRoles !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'selectedRoles object required' })
  }

  return await retryOnVersionConflict(async () => {
    const game = await getGameForNarrator(event, id!, userId)

    game.selectedRoles = selectedRoles

    game.logs.push({
      timestamp: new Date(),
      phase: game.status,
      message: `Role selection updated`,
      type: 'system',
    })

    await game.save()
    broadcastGameUpdate(game)

    return { success: true, data: game }
  })
})
