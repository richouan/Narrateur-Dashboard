import type { H3Event } from 'h3'
import { Game } from '~~/server/models/Game'

/**
 * Gets a game by ID and verifies the narrator has access to it
 */
export async function getGameForNarrator(event: H3Event, gameId: string, userId: string) {
  const game = await Game.findById(gameId)

  if (!game) {
    throw createError({ statusCode: 404, statusMessage: 'Game not found' })
  }

  // Ensure narrator can only access their own games
  if (game.narratorId !== userId) {
    throw createError({ statusCode: 403, statusMessage: 'Access denied to this game' })
  }

  return game
}
