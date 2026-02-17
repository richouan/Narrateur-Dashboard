import { Game } from '~~/server/models/Game'
import { requireAuth } from '~~/server/utils/auth'
import { getGameForNarrator } from '~~/server/utils/game'
import { broadcastGameUpdate } from '~~/server/utils/websocket'

export default defineEventHandler(async (event) => {
  const { userId } = requireAuth(event)

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { players } = body // Array of { id, name, discordId? }

  if (!Array.isArray(players)) {
    throw createError({ statusCode: 400, statusMessage: 'Players array required' })
  }

  // Retry logic for version conflicts (optimistic concurrency control)
  const maxRetries = 3
  let attempt = 0
  let lastError: any = null

  while (attempt < maxRetries) {
    try {
      // Fetch fresh game data on each attempt
      const game = await getGameForNarrator(event, id!, userId)

      game.players = players.map((p: any) => ({
        id: p.id || crypto.randomUUID(),
        name: p.name,
        discordId: p.discordId || undefined,
        avatar: p.avatar || undefined,
        roleId: p.roleId || undefined,
        roleName: p.roleName || undefined,
        isAlive: p.isAlive !== undefined ? p.isAlive : true,
        isCaptain: p.isCaptain || false,
        isInfected: p.isInfected || false,
      }))

      game.logs.push({
        timestamp: new Date(),
        phase: game.status,
        message: `Players updated (${players.length} players)`,
        type: 'system',
      })

      await game.save()
      broadcastGameUpdate(game)

      return { success: true, data: game }
    } catch (error: any) {
      lastError = error
      
      // Check if it's a version conflict error
      if (error.name === 'VersionError' && attempt < maxRetries - 1) {
        attempt++
        // Exponential backoff: wait 50ms, then 100ms, then 200ms
        await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, attempt)))
        continue
      }
      
      // Not a version error or max retries reached - rethrow
      throw error
    }
  }

  // If we get here, all retries failed
  throw createError({ 
    statusCode: 409, 
    statusMessage: 'Update conflict - please try again',
    data: lastError 
  })
})
