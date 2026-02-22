import { Game } from '~~/server/models/Game'
import { requireAuth } from '~~/server/utils/auth'
import { getGameForNarrator } from '~~/server/utils/game'
import { broadcastGameUpdate } from '~~/server/utils/websocket'

// Valid state transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  SETUP: ['CONFIRMATION', 'END'],
  CONFIRMATION: ['SETUP', 'CAPTAIN_APPLICATION', 'FIRST_NIGHT'],
  CAPTAIN_APPLICATION: ['CONFIRMATION', 'CAPTAIN_SPIN', 'CAPTAIN_VOTE', 'END'],
  CAPTAIN_SPIN: ['CAPTAIN_APPLICATION', 'CAPTAIN_VOTE', 'END'],
  CAPTAIN_VOTE: ['CAPTAIN_APPLICATION', 'FIRST_NIGHT', 'END'],
  FIRST_NIGHT: ['CAPTAIN_VOTE', 'DAY', 'END'],
  DAY: ['VOTE', 'NIGHT', 'FIRST_NIGHT', 'END'],
  VOTE: ['DAY', 'NIGHT', 'FIRST_NIGHT', 'END'],
  NIGHT: ['DAY', 'VOTE', 'END'],
  END: ['SETUP'],
}

export default defineEventHandler(async (event) => {
  const { userId } = requireAuth(event)

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { targetPhase, isBack = false, setDayNumber, setNightNumber } = body

  if (!targetPhase) {
    throw createError({ statusCode: 400, message: 'Target phase required' })
  }

  const game = await getGameForNarrator(event, id!, userId)

  const allowed = VALID_TRANSITIONS[game.status]
  if (!allowed || !allowed.includes(targetPhase)) {
    throw createError({
      statusCode: 400,
      message: `Invalid transition: ${game.status} → ${targetPhase}`,
    })
  }

  // ── Night number ──
  if (setNightNumber !== undefined) {
    // Client provided an explicit value — use it directly (prevents drift on back+forward)
    game.nightNumber = setNightNumber
  } else {
    // Forward only: CAPTAIN_VOTE→FIRST_NIGHT, VOTE→NIGHT, or DAY→NIGHT (skip-vote forward)
    if (!isBack) {
      if (targetPhase === 'NIGHT' && ['DAY', 'VOTE'].includes(game.status)) {
        game.nightNumber = (game.nightNumber || 0) + 1
      }
      if (targetPhase === 'FIRST_NIGHT' && game.status === 'CAPTAIN_VOTE') {
        game.nightNumber = (game.nightNumber || 0) + 1
      }
    }
    // Backward — these transitions are always backward in the timeline
    if (targetPhase === 'VOTE' && game.status === 'NIGHT') {
      game.nightNumber = Math.max(0, (game.nightNumber || 0) - 1)
    }
    if (targetPhase === 'CAPTAIN_VOTE' && game.status === 'FIRST_NIGHT') {
      game.nightNumber = Math.max(0, (game.nightNumber || 0) - 1)
    }
  }

  // ── Day number ──
  if (setDayNumber !== undefined) {
    // Client provided an explicit value — use it directly (prevents drift on back+forward)
    game.dayNumber = setDayNumber
  } else {
    // Forward only: FIRST_NIGHT→DAY or NIGHT→DAY
    if (!isBack && targetPhase === 'DAY' && ['NIGHT', 'FIRST_NIGHT'].includes(game.status)) {
      game.dayNumber = (game.dayNumber || 0) + 1
    }
    // NOTE: VOTE→DAY backward does NOT change dayNumber — we're still on the same day
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
