import { requireAuth } from '~~/server/utils/auth'
import { connectDB } from '~~/server/utils/db'
import { User } from '~~/server/models/User'

export default defineEventHandler(async (event) => {
  const { userId } = requireAuth(event)

  await connectDB()
  const user = await User.findById(userId).lean()
  if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  return {
    success: true,
    data: {
      id: user.discordId || null,
      username: user.username,
      displayName: user.discordDisplayName || user.username,
      avatar: user.avatar || null,
      banner: user.banner || null,
    }
  }
})
