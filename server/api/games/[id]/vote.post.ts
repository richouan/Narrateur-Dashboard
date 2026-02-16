import { Game } from '~~/server/models/Game'
import { requireAuth } from '~~/server/utils/auth'
import { broadcastGameUpdate } from '~~/server/utils/websocket'

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { dayNumber, votes } = body

  if (!dayNumber || !Array.isArray(votes)) {
    throw createError({ statusCode: 400, statusMessage: 'dayNumber and votes array required' })
  }

  const game = await Game.findById(id)
  if (!game) {
    throw createError({ statusCode: 404, statusMessage: 'Game not found' })
  }

  // Calculate vote results
  const voteCounts: Record<string, number> = {}
  for (const vote of votes) {
    const weight = vote.weight || 1
    voteCounts[vote.target] = (voteCounts[vote.target] || 0) + weight
  }

  // Find the player with most votes
  let maxVotes = 0
  let eliminated = ''
  let isTie = false

  for (const [target, count] of Object.entries(voteCounts)) {
    if (count > maxVotes) {
      maxVotes = count
      eliminated = target
      isTie = false
    } else if (count === maxVotes) {
      isTie = true
    }
  }

  const result = isTie
    ? `Tie detected (${maxVotes} votes each)`
    : `${eliminated} eliminated with ${maxVotes} votes`

  game.voteLogs.push({ dayNumber, votes, result })

  game.logs.push({
    timestamp: new Date(),
    phase: 'VOTE',
    message: result,
    type: isTie ? 'info' : 'death',
  })

  await game.save()
  broadcastGameUpdate(game)

  return {
    success: true,
    data: {
      game,
      voteResult: {
        counts: voteCounts,
        eliminated: isTie ? null : eliminated,
        isTie,
        result,
      },
    },
  }
})
