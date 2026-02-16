import { Game } from '~~/server/models/Game'
import { requireAuth } from '~~/server/utils/auth'
import { broadcastGameUpdate } from '~~/server/utils/websocket'

type ActionType = 'kill' | 'infect' | 'revive' | 'set_captain' | 'remove_captain'

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { action, playerId, data } = body as { action: ActionType; playerId: string; data?: any }

  if (!action || !playerId) {
    throw createError({ statusCode: 400, statusMessage: 'Action and playerId required' })
  }

  const game = await Game.findById(id)
  if (!game) {
    throw createError({ statusCode: 404, statusMessage: 'Game not found' })
  }

  const player = game.players.find((p: any) => p.id === playerId)
  if (!player) {
    throw createError({ statusCode: 404, statusMessage: 'Player not found' })
  }

  let logMessage = ''

  switch (action) {
    case 'kill':
      player.isAlive = false
      logMessage = `${player.name} has been killed`
      break

    case 'infect':
      player.isInfected = true
      logMessage = `${player.name} has been infected`
      break

    case 'revive':
      player.isAlive = true
      logMessage = `${player.name} has been revived`
      break

    case 'set_captain':
      // Remove captain from others
      game.players.forEach((p: any) => { p.isCaptain = false })
      player.isCaptain = true
      game.captainId = playerId
      logMessage = `${player.name} is now the Captain`
      break

    case 'remove_captain':
      player.isCaptain = false
      if (game.captainId === playerId) game.captainId = undefined
      logMessage = `${player.name} is no longer Captain`
      break

    default:
      throw createError({ statusCode: 400, statusMessage: 'Invalid action' })
  }

  game.logs.push({
    timestamp: new Date(),
    phase: game.status,
    message: logMessage,
    type: action === 'kill' ? 'death' : 'action',
  })

  await game.save()
  broadcastGameUpdate(game)

  return { success: true, data: game }
})
