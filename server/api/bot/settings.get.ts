import { connectDB } from '~~/server/utils/db'
import { requireAuth } from '~~/server/utils/auth'
import { User } from '~~/server/models/User'
import mongoose from 'mongoose'

const DEFAULT_SETTINGS = {
  selfReactEnabled: false,
  selfReactMode: 'random',
  selfReactEmoji: '',
  vcFollow: false,
  vcSadReact: false,
  crossGuildLeave: false,
  followStage: false,
  snipeEnabled: false,
  defendMode: 0,
  defendReplies: ['😂', '💀', '🤣'],
  customDefends: [],
  presence: {},
  presenceProfiles: [],
  presenceEnabled: false,
  aiEnabled: false,
  geminiApiKey: '',
}

export default defineEventHandler(async (event) => {
  const { userId } = requireAuth(event)
  const config = useRuntimeConfig()

  await connectDB()

  // Same isBotTarget logic as me.get.ts: selfbotProfile OR discordId match
  const user = await User.findById(userId)
  const isBotTarget = !!user && (
    !!(user as any).selfbotProfile ||
    (!!user.discordId && !!config.stalkUserId && user.discordId === config.stalkUserId)
  )
  if (!user || !isBotTarget) {
    throw createError({ statusCode: 403, statusMessage: 'Access denied' })
  }

  const doc = await mongoose.connection.db!.collection('bot_config').findOne({ _id: 'settings' as any })
  if (!doc) {
    // No settings saved yet — return defaults so the panel renders
    return { success: true, data: DEFAULT_SETTINGS }
  }

  const { _id, ...settings } = doc
  return { success: true, data: { ...DEFAULT_SETTINGS, ...settings } }
})
