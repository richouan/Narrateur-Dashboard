import { requireAuth } from '~~/server/utils/auth'
import { User } from '~~/server/models/User'

export default defineEventHandler(async (event) => {
  const { userId } = requireAuth(event)
  const body = await readBody<{ volume?: number }>(event)
  if (typeof body?.volume === 'number') {
    await User.updateOne({ _id: userId }, { $set: { musicVolume: body.volume } })
  }
  return { success: true }
})
