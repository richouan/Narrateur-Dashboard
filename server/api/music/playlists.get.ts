import { requireAuth } from '~~/server/utils/auth'
import { User } from '~~/server/models/User'

export default defineEventHandler(async (event) => {
  const { userId } = requireAuth(event)
  const user = await User.findById(userId).select('musicPlaylists').lean()
  if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  return { playlists: user.musicPlaylists ?? [] }
})
