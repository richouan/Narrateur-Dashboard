import { Game } from '~~/server/models/Game'
import { broadcastGameUpdate } from '~~/server/utils/websocket'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { players } = body

  if (!Array.isArray(players)) {
    throw createError({ statusCode: 400, statusMessage: 'Players array required' })
  }

  // Find the active game (not ended)
  const game = await Game.findOne({ status: { $ne: 'END' } }).sort({ createdAt: -1 })
  if (!game) {
    throw createError({ statusCode: 404, statusMessage: 'No active game found' })
  }

  // Sync voice channel players with game
  for (const discordPlayer of players) {
    const existing = game.players.find((p: any) => p.discordId === discordPlayer.discordId)
    if (!existing) {
      game.players.push({
        id: crypto.randomUUID(),
        name: discordPlayer.username,
        discordId: discordPlayer.discordId,
        isAlive: true,
        isCaptain: false,
        isInfected: false,
      })
    }
  }

  game.logs.push({
    timestamp: new Date(),
    phase: game.status,
    message: `Discord voice sync: ${players.length} players detected`,
    type: 'system',
  })

  await game.save()
  broadcastGameUpdate(game)

  return {
    success: true,
    data: {
      gameId: game._id,
      playerCount: game.players.length,
    },
  }
})
