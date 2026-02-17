import { Game } from '~~/server/models/Game'
import { clearFetchRequest, getBotState } from '~~/server/utils/discord-bot-state'
import { broadcastGameUpdate } from '~~/server/utils/websocket'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { discordId, username, displayName, avatar, found } = body
  
  if (!discordId) {
    throw createError({ statusCode: 400, statusMessage: 'discordId required' })
  }
  
  // Clear the fetch request
  clearFetchRequest(discordId)
  
  if (!found) {
    return { success: false, message: 'User not found' }
  }
  
  // Get active game
  const state = getBotState()
  const gameId = state.game.gameId
  
  if (!gameId) {
    return { success: false, message: 'No active game' }
  }
  
  const game = await Game.findById(gameId)
  if (!game) {
    return { success: false, message: 'Game not found' }
  }
  
  // Check if player already exists
  const existingPlayer = game.players.find((p: any) => p.discordId === discordId)
  
  if (existingPlayer) {
    return { success: false, message: 'Player already in game' }
  }
  
  // Add player - use displayName (the real name) if available, fallback to username
  const playerName = displayName || username
  game.players.push({
    id: crypto.randomUUID(),
    name: playerName,
    discordId,
    avatar,
    isAlive: true,
    isCaptain: false,
    isInfected: false,
  })
  
  game.logs.push({
    timestamp: new Date(),
    phase: game.status,
    message: `Player added: ${playerName}`,
    type: 'system',
  })
  
  await game.save()
  broadcastGameUpdate(game)
  
  return { success: true, player: { discordId, username: playerName, avatar } }
})
