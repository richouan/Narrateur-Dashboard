import { Game } from '~~/server/models/Game'
import { requireAuth } from '~~/server/utils/auth'
import { getGameForNarrator } from '~~/server/utils/game'

export default defineEventHandler(async (event) => {
  const { userId } = requireAuth(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const game = await getGameForNarrator(event, id!, userId)

  if (!['CAPTAIN_APPLICATION', 'CAPTAIN_VOTE', 'CAPTAIN_SPIN'].includes(game.status)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Captain election data can only be saved during captain phases',
    })
  }

  // Save candidates if provided
  if (body.captainCandidates !== undefined) {
    game.captainCandidates = body.captainCandidates
  }

  // Save votes if provided
  if (body.captainVotes !== undefined) {
    // Mongoose Map needs special handling
    if (game.captainVotes instanceof Map) {
      game.captainVotes.clear()
      for (const [key, value] of Object.entries(body.captainVotes)) {
        game.captainVotes.set(key, value as string)
      }
    } else {
      game.captainVotes = body.captainVotes
    }
  }

  // Save spin state if provided
  if (body.spinCandidates !== undefined) {
    game.spinCandidates = body.spinCandidates
  }
  if (body.spinResult !== undefined) {
    game.spinResult = body.spinResult
  }

  await game.save()

  return { success: true, data: game }
})
