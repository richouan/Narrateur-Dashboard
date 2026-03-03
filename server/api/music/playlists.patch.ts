import { requireAuth } from '~~/server/utils/auth'
import { User } from '~~/server/models/User'
import type { IMusicPlaylist } from '~~/server/models/User'

export default defineEventHandler(async (event) => {
  const { userId } = requireAuth(event)
  const body = await readBody<{ playlists: IMusicPlaylist[] }>(event)

  if (!Array.isArray(body?.playlists)) {
    throw createError({ statusCode: 400, statusMessage: 'playlists must be an array' })
  }

  await User.updateOne({ _id: userId }, { $set: { musicPlaylists: body.playlists } })
  return { success: true }
})
