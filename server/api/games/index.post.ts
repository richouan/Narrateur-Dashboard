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
      statusMessage: `Vous avez déjà une partie active (${activeGame.status}). Merci de la terminer avant d'en créer une nouvelle.`,
      data: { activeGameId: activeGame._id },
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
