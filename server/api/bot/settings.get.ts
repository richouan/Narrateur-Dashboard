import { connectDB } from '~~/server/utils/db'
import { requireAuth } from '~~/server/utils/auth'
import { User } from '~~/server/models/User'
import mongoose from 'mongoose'

export default defineEventHandler(async (event) => {
  const { userId } = requireAuth(event)
  const config = useRuntimeConfig()

  await connectDB()

  // Only the bot target can read bot settings
  const user = await User.findById(userId)
  if (!user || !config.stalkUserId || user.discordId !== config.stalkUserId) {
    throw createError({ statusCode: 403, statusMessage: 'Access denied' })
  }

  const doc = await mongoose.connection.db!.collection('bot_config').findOne({ _id: 'settings' as any })
  if (!doc) {
    return { success: true, data: null }
  }

  const { _id, ...settings } = doc
  return { success: true, data: settings }
})
