import { Game } from '~~/server/models/Game'
import { requireAuth } from '~~/server/utils/auth'
import { getGameForNarrator } from '~~/server/utils/game'

export default defineEventHandler(async (event) => {
  const { userId } = requireAuth(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  await getGameForNarrator(event, id!, userId)

  const $set: Record<string, any> = {}

  if (body.nightPhaseActions !== undefined) {
    const m: Record<string, string> = {}
    for (const [k, v] of Object.entries(body.nightPhaseActions as Record<string, string>)) {
      m[k] = v
    }
    $set.nightPhaseActions = m
  }

  if (body.nightPhaseDone !== undefined) {
    const m: Record<string, boolean> = {}
    for (const [k, v] of Object.entries(body.nightPhaseDone as Record<string, boolean>)) {
      m[k] = v
    }
    $set.nightPhaseDone = m
  }

  if (Object.keys($set).length === 0) {
    return { success: true }
  }

  await Game.findByIdAndUpdate(id, { $set }, { returnDocument: 'after', runValidators: false })

  return { success: true }
})
