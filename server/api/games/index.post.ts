import { Game } from '~~/server/models/Game'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const game = new Game({
    status: 'SETUP',
    players: [],
    nightNumber: 0,
    dayNumber: 0,
    logs: [{
      timestamp: new Date(),
      phase: 'SETUP',
      message: 'New game created',
      type: 'system',
    }],
  })

  await game.save()

  return { success: true, data: game }
})
