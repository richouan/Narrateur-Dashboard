import { requireAuth } from '~~/server/utils/auth'
import { Game } from '~~/server/models/Game'
import { clearPendingScanResults } from '~~/server/utils/discord-bot-state'
import { broadcastGameUpdate } from '~~/server/utils/websocket'

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  
  const body = await readBody(event)
  const { gameId, selectedPlayers } = body
  // selectedPlayers: Array of { discordId, username, displayName, avatar }
  
  if (!gameId || !Array.isArray(selectedPlayers)) {
    throw createError({ statusCode: 400, statusMessage: 'gameId and selectedPlayers required' })
  }
  
  const game = await Game.findById(gameId)
  if (!game) {
    throw createError({ statusCode: 404, statusMessage: 'Game not found' })
  }
  
  let addedCount = 0
  
  // Add selected players
  for (const player of selectedPlayers) {
    const existingPlayer = game.players.find((p: any) => p.discordId === player.discordId)
    
    if (!existingPlayer) {
      game.players.push({
        id: crypto.randomUUID(),
        name: player.displayName || player.username,
        discordId: player.discordId,
        avatar: player.avatar,
        isAlive: true,
        isCaptain: false,
        isInfected: false,
      })
      addedCount++
    }
  }
  
  if (addedCount > 0) {
    game.logs.push({
      timestamp: new Date(),
      phase: game.status,
      message: `Added ${addedCount} player${addedCount > 1 ? 's' : ''} from Discord scan`,
      type: 'system',
    })
    
    await game.save()
    broadcastGameUpdate(game)
  }
  
  // Clear pending results after adding
  clearPendingScanResults()
  
  return { success: true, playersAdded: addedCount }
})
