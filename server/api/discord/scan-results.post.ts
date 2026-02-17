import { Game } from '~~/server/models/Game'
import { clearScanRequest, getBotState } from '~~/server/utils/discord-bot-state'
import { broadcastGameUpdate } from '~~/server/utils/websocket'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { players } = body // Array of { discordId, username, displayName, avatar }
  
  if (!Array.isArray(players)) {
    throw createError({ statusCode: 400, statusMessage: 'players array required' })
  }
  
  // Get the game ID from bot state
  const state = getBotState()
  const gameId = state.game.gameId
  
  if (!gameId) {
    throw createError({ statusCode: 400, statusMessage: 'No active game in bot state' })
  }
  
  // Find the game
  const game = await Game.findById(gameId)
  if (!game) {
    throw createError({ statusCode: 404, statusMessage: 'Game not found' })
  }
  
  // Add/update players from scan
  for (const player of players) {
    const existingPlayer = game.players.find((p: any) => p.discordId === player.discordId)
    
    if (!existingPlayer) {
      game.players.push({
        id: crypto.randomUUID(),
        name: player.displayName || player.username,
        discordId: player.discordId,
        isAlive: true,
        isCaptain: false,
        isInfected: false,
      })
    }
  }
  
  game.logs.push({
    timestamp: new Date(),
    phase: game.status,
    message: `Discord scan: ${players.length} players detected`,
    type: 'system',
  })
  
  await game.save()
  
  // Clear the scan request
  clearScanRequest()
  
  // Broadcast update
  broadcastGameUpdate(game)
  
  console.log(`✅ Added ${players.length} players to game ${gameId}`)
  
  return { success: true, playersAdded: players.length, gameId }
})
