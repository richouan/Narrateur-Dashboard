import { Game } from '~~/server/models/Game'
import { requireAuth } from '~~/server/utils/auth'
import { getGameForNarrator } from '~~/server/utils/game'

export default defineEventHandler(async (event) => {
  const { userId } = requireAuth(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  // Auth + status check only (no save on this instance)
  const game = await getGameForNarrator(event, id!, userId)

  if (!['CAPTAIN_APPLICATION', 'CAPTAIN_VOTE', 'CAPTAIN_SPIN'].includes(game.status)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Captain election data can only be saved during captain phases',
    })
  }

  // Build atomic $set payload — only include fields that were provided
  const $set: Record<string, any> = {}

  if (body.captainCandidates !== undefined) {
    $set.captainCandidates = body.captainCandidates
  }

  if (body.captainVotes !== undefined) {
    // Store as plain object (captainVotes is a Map in Mongoose but we store via $set)
    const votesObj: Record<string, string> = {}
    for (const [k, v] of Object.entries(body.captainVotes as Record<string, string>)) {
      votesObj[k] = v
    }
    $set.captainVotes = votesObj
  }

  if (body.spinCandidates !== undefined) {
    $set.spinCandidates = body.spinCandidates
  }
  if (body.spinResult !== undefined) {
    $set.spinResult = body.spinResult
  }

  if (body.captainVoteRounds !== undefined) {
    $set.captainVoteRounds = body.captainVoteRounds
  }

  if (body.captainVoterFilter !== undefined) {
    $set.captainVoterFilter = body.captainVoterFilter
  }

  if (Object.keys($set).length === 0) {
    return { success: true, data: game }
  }

  // Atomic update — bypasses Mongoose version conflicts entirely
  const updated = await Game.findByIdAndUpdate(
    id,
    { $set },
    { returnDocument: 'after', runValidators: false },
  )

  return { success: true, data: updated }
})
