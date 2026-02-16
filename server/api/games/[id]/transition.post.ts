import { Game } from '~~/server/models/Game'
import { requireAuth } from '~~/server/utils/auth'
import { broadcastGameUpdate } from '~~/server/utils/websocket'

// Valid state transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  SETUP: ['CAPTAIN_APPLICATION', 'FIRST_NIGHT'],
  CAPTAIN_APPLICATION: ['CAPTAIN_SPIN', 'CAPTAIN_VOTE'],
  CAPTAIN_SPIN: ['CAPTAIN_VOTE'],
  CAPTAIN_VOTE: ['FIRST_NIGHT'],
  FIRST_NIGHT: ['DAY'],
  DAY: ['VOTE', 'NIGHT', 'END'],
  VOTE: ['DAY', 'NIGHT', 'END'],
  NIGHT: ['DAY', 'END'],
  END: ['SETUP'],
}

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { targetPhase } = body

  if (!targetPhase) {
    throw createError({ statusCode: 400, statusMessage: 'Target phase required' })
  }

  const game = await Game.findById(id)
  if (!game) {
    throw createError({ statusCode: 404, statusMessage: 'Game not found' })
  }

  const allowed = VALID_TRANSITIONS[game.status]
  if (!allowed || !allowed.includes(targetPhase)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid transition: ${game.status} → ${targetPhase}`,
    })
  }

  // Handle phase-specific logic
  if (targetPhase === 'NIGHT' || targetPhase === 'FIRST_NIGHT') {
    game.nightNumber = (game.nightNumber || 0) + 1
  }

  if (targetPhase === 'DAY') {
    game.dayNumber = (game.dayNumber || 0) + 1
  }

  if (targetPhase === 'END') {
    game.endedAt = new Date()
  }

  game.status = targetPhase
  game.logs.push({
    timestamp: new Date(),
    phase: targetPhase,
    message: `Phase changed to ${targetPhase}`,
    type: 'system',
  })

  await game.save()

  // Broadcast via WebSocket
  broadcastGameUpdate(game)

  return { success: true, data: game }
})
