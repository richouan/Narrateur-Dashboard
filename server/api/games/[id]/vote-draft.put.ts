import { Game } from '~~/server/models/Game'
import { requireAuth } from '~~/server/utils/auth'
import { getGameForNarrator } from '~~/server/utils/game'

export default defineEventHandler(async (event) => {
  const { userId } = requireAuth(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  await getGameForNarrator(event, id!, userId)

  const { voteDraft, dayNumber } = body
  if (!voteDraft || dayNumber == null) return { success: true }

  const m: Record<string, string> = {}
  for (const [k, v] of Object.entries(voteDraft as Record<string, string>)) {
    m[k] = v
  }

  // Save to voteDrafts.{dayNumber} — each day keeps its own vote draft
  await Game.findByIdAndUpdate(
    id,
    { $set: { [`voteDrafts.${dayNumber}`]: m } },
    { runValidators: false },
  )

  return { success: true }
})
