import { Game } from '~~/server/models/Game'
import { requireAuth } from '~~/server/utils/auth'
import { getGameForNarrator } from '~~/server/utils/game'
import { broadcastGameUpdate } from '~~/server/utils/websocket'
import { retryOnVersionConflict } from '~~/server/utils/retry'

export default defineEventHandler(async (event) => {
  const { userId } = requireAuth(event)

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { players } = body // Array of { id, name, discordId? }

  if (!Array.isArray(players)) {
    throw createError({ statusCode: 400, statusMessage: 'Players array required' })
  }

  return await retryOnVersionConflict(async () => {
    // Fetch fresh game data on each attempt
    const game = await getGameForNarrator(event, id!, userId)

    game.players = players.map((p: any, index: number) => ({
      id: p.id || crypto.randomUUID(),
      number: p.number !== undefined ? p.number : (index + 1),
      name: p.name,
      discordId: p.discordId || undefined,
      avatar: p.avatar || undefined,
      roleId: p.roleId || undefined,
      roleName: p.roleName || undefined,
      roleTeam: p.roleTeam || undefined,
      roleIsUnique: p.roleIsUnique !== undefined ? p.roleIsUnique : undefined,
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
  })
})
