import { connectDB } from '~~/server/utils/db'
import { requireAuth } from '~~/server/utils/auth'
import { User } from '~~/server/models/User'
import { setPendingSettingsUpdate } from '~~/server/utils/discord-bot-state'
import mongoose from 'mongoose'

const ALLOWED_FIELDS = ['selfReactEnabled', 'vcFollow', 'vcSadReact', 'crossGuildLeave', 'followStage', 'snipeEnabled', 'defendMode', 'defendReplies', 'presence']

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
    } else if (key === 'presence') {
      // Allow null (clear presence) or a valid presence object
      if (body[key] === null) {
        update[key] = null
        continue
      }
      if (typeof body[key] !== 'object') continue
      const p = body[key]
      const VALID_STATUSES = ['online', 'idle', 'dnd', 'invisible']
      const VALID_TYPES    = ['PLAYING', 'WATCHING', 'LISTENING', 'COMPETING', 'CUSTOM']
      const cleaned: Record<string, any> = {}
      if (VALID_STATUSES.includes(p.status)) cleaned.status = p.status
      else cleaned.status = 'online'
      if (VALID_TYPES.includes(p.activityType)) cleaned.activityType = p.activityType
      else cleaned.activityType = 'PLAYING'
      cleaned.activityName    = typeof p.activityName    === 'string' ? p.activityName.slice(0, 128)    : ''
      cleaned.activityDetails = typeof p.activityDetails === 'string' ? p.activityDetails.slice(0, 128) : ''
      cleaned.activityState   = typeof p.activityState   === 'string' ? p.activityState.slice(0, 128)   : ''
      cleaned.largeImage      = typeof p.largeImage      === 'string' ? p.largeImage.slice(0, 256)      : ''
      cleaned.largeText       = typeof p.largeText       === 'string' ? p.largeText.slice(0, 128)       : ''
      cleaned.smallImage      = typeof p.smallImage      === 'string' ? p.smallImage.slice(0, 256)      : ''
      cleaned.smallText       = typeof p.smallText       === 'string' ? p.smallText.slice(0, 128)       : ''
      update[key] = cleaned
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
