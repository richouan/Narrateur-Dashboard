import { Game } from '~~/server/models/Game'
import { requireAuth } from '~~/server/utils/auth'
import { getGameForNarrator } from '~~/server/utils/game'

export default defineEventHandler(async (event) => {
  const { userId } = requireAuth(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { action, dayNumber, playerIds = [] } = body as {
    action: 'add' | 'clear'
    dayNumber: number
    playerIds?: string[]
  }

  if (!action || dayNumber == null) return { success: true }

  await getGameForNarrator(event, id!, userId)

  const game = await Game.findById(id)
  if (!game) throw createError({ statusCode: 404, message: 'Game not found' })

  const kills: Record<string, string[]> = (game.voteKills as any) || {}
  const key = String(dayNumber)

  if (action === 'add' && playerIds.length > 0) {
    const existing = kills[key] || []
    kills[key] = [...new Set([...existing, ...playerIds])]
  } else if (action === 'clear') {
    delete kills[key]
  }

  game.voteKills = kills
  game.markModified('voteKills')
  await game.save()

  return { success: true }
})
