import { Game } from '~~/server/models/Game'
import { requireAuth } from '~~/server/utils/auth'
import { broadcastGameUpdate } from '~~/server/utils/websocket'

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { nightNumber, actions } = body

  if (!nightNumber || !Array.isArray(actions)) {
    throw createError({ statusCode: 400, statusMessage: 'nightNumber and actions array required' })
  }

  const game = await Game.findById(id)
  if (!game) {
    throw createError({ statusCode: 404, statusMessage: 'Game not found' })
  }

  game.nightLogs.push({ nightNumber, actions })

  // Process night results
  for (const action of actions) {
    const logMsg = `[Night ${nightNumber}] ${action.role}: ${action.actor} → ${action.target} (${action.result})`
    game.logs.push({
      timestamp: new Date(),
      phase: game.status,
      message: logMsg,
      type: 'action',
    })
  }

  await game.save()
  broadcastGameUpdate(game)

  return { success: true, data: game }
})
