import { requireAuth } from '~~/server/utils/auth'
import { connectDB } from '~~/server/utils/db'
import { User } from '~~/server/models/User'
import { getCachedBotProfile } from '~~/server/utils/discord-bot-state'

export default defineEventHandler(async (event) => {
  const { userId } = requireAuth(event)
  const config = useRuntimeConfig()

  await connectDB()

  const user = await User.findById(userId)
  if (!user || !config.stalkUserId || user.discordId !== config.stalkUserId) {
    throw createError({ statusCode: 403, statusMessage: 'Access denied' })
  }

  const profile = await getCachedBotProfile()
  return { success: true, data: profile }
})

