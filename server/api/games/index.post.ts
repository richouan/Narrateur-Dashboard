import { Game } from '~~/server/models/Game'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const { userId } = requireAuth(event)

  // Check if narrator already has an active game
  const activeGame = await Game.findOne({
    narratorId: userId,
    status: { $ne: 'END' },
  })

  if (activeGame) {
    throw createError({
      statusCode: 409,
      statusMessage: 'You already have an active game. Please finish it before starting a new one.',
    })
  }

  const game = new Game({
    narratorId: userId,
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
