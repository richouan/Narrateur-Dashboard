import { Game } from '~~/server/models/Game'
import { requireAuth } from '~~/server/utils/auth'
import { getGameForNarrator } from '~~/server/utils/game'

export default defineEventHandler(async (event) => {
  const { userId } = requireAuth(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  await getGameForNarrator(event, id!, userId)

  const { voteDraft, dayNumber, revoteState } = body
  if (dayNumber == null) return { success: true }

  const setPayload: Record<string, any> = {}

  if (voteDraft) {
    const m: Record<string, string> = {}
    for (const [k, v] of Object.entries(voteDraft as Record<string, string>)) {
      m[k] = v
    }
    setPayload[`voteDrafts.${dayNumber}`] = m
  }

  // Save revote state (round, history, candidates, manualPick) alongside the draft
  if (revoteState !== undefined) {
    setPayload[`voteRevoteState.${dayNumber}`] = revoteState
  }

  if (Object.keys(setPayload).length) {
    await Game.findByIdAndUpdate(id, { $set: setPayload }, { runValidators: false })
  }

  return { success: true }
})
