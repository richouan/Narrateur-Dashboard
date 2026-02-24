import { connectDB } from '~~/server/utils/db'
import { requireAuth } from '~~/server/utils/auth'
import { User } from '~~/server/models/User'
import { setPendingSettingsUpdate } from '~~/server/utils/discord-bot-state'
import mongoose from 'mongoose'

const ALLOWED_FIELDS = ['selfReactEnabled', 'vcFollow', 'vcSadReact', 'crossGuildLeave', 'followStage', 'snipeEnabled', 'defendMode', 'defendReplies']

export default defineEventHandler(async (event) => {
  const { userId } = requireAuth(event)
  const config = useRuntimeConfig()

  await connectDB()

  // Only the bot target can write bot settings
  const user = await User.findById(userId)
  if (!user || !config.stalkUserId || user.discordId !== config.stalkUserId) {
    throw createError({ statusCode: 403, statusMessage: 'Access denied' })
  }

  const body = await readBody(event)

  // Whitelist — only safe fields, type-checked
  const update: Record<string, any> = {}
  for (const key of ALLOWED_FIELDS) {
    if (body[key] === undefined) continue
    if (key === 'defendMode') {
      const val = Number(body[key])
      if (![0, 1, 2].includes(val)) continue
      update[key] = val
    } else if (key === 'defendReplies') {
      if (!Array.isArray(body[key])) continue
      const replies = body[key].filter((r: any) => typeof r === 'string' && r.trim().length > 0).slice(0, 50)
      if (replies.length === 0) continue
      update[key] = replies
    } else {
      update[key] = Boolean(body[key])
    }
  }

  if (Object.keys(update).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No valid fields to update' })
  }

  update.updatedAt = new Date()

  await mongoose.connection.db!.collection('bot_config').updateOne(
    { _id: 'settings' as any },
    { $set: update },
    { upsert: true }
  )

  // Push to in-memory state so the bot picks it up within 3 seconds (no restart needed)
  setPendingSettingsUpdate(update)

  return { success: true }
})
