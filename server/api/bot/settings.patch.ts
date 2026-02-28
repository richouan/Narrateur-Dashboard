import { connectDB } from '~~/server/utils/db'
import { requireAuth } from '~~/server/utils/auth'
import { User } from '~~/server/models/User'
import { setPendingSettingsUpdate } from '~~/server/utils/discord-bot-state'
import mongoose from 'mongoose'

const ALLOWED_FIELDS = ['selfReactEnabled', 'selfReactMode', 'selfReactEmoji', 'vcFollow', 'vcSadReact', 'crossGuildLeave', 'followStage', 'snipeEnabled', 'defendMode', 'defendReplies', 'customDefends', 'presence', 'presenceProfiles', 'presenceEnabled', 'aiEnabled', 'geminiApiKey']

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
    if (key === 'selfReactMode') {
      const mode = body[key]
      if (mode === 'random' || mode === 'fixed') update[key] = mode
    } else if (key === 'selfReactEmoji') {
      const emoji = body[key]
      if (typeof emoji === 'string') update[key] = emoji // we allow empty string '' to mean 'none selected'
    } else if (key === 'defendMode') {
      const val = Number(body[key])
      if (![0, 1, 2].includes(val)) continue
      update[key] = val
    } else if (key === 'defendReplies') {
      if (!Array.isArray(body[key])) continue
      const replies = body[key].filter((r: any) => typeof r === 'string' && r.trim().length > 0).slice(0, 50)
      if (replies.length === 0) continue
      update[key] = replies
    } else if (key === 'customDefends') {
      if (!Array.isArray(body[key])) continue
      const valArr = body[key]
        .filter((c: any) => c && typeof c === 'object' && typeof c.userId === 'string' && c.userId.trim() && Array.isArray(c.replies))
        .map((c: any) => ({
          userId: c.userId.trim(),
          username: typeof c.username === 'string' ? c.username.trim().slice(0, 32) : 'Unknown',
          replies: c.replies.filter((r: any) => typeof r === 'string' && r.trim().length > 0).slice(0, 50)
        }))
        .filter((c: any) => c.replies.length > 0)
        .slice(0, 100) // max 100 custom defend targets
      update[key] = valArr
    } else if (key === 'presence') {
      // Allow null (clear presence) or a valid presence object
      if (body[key] === null) {
        update[key] = null
        continue
      }
      if (typeof body[key] !== 'object') continue
      const p = body[key]
      const VALID_STATUSES = ['online', 'idle', 'dnd', 'invisible']
      const VALID_TYPES = ['PLAYING', 'WATCHING', 'LISTENING', 'COMPETING', 'CUSTOM']
      const cleaned: Record<string, any> = {}
      if (VALID_STATUSES.includes(p.status)) cleaned.status = p.status
      else cleaned.status = 'online'
      if (VALID_TYPES.includes(p.activityType)) cleaned.activityType = p.activityType
      else cleaned.activityType = 'PLAYING'
      cleaned.activityName = typeof p.activityName === 'string' ? p.activityName.slice(0, 128) : ''
      cleaned.activityDetails = typeof p.activityDetails === 'string' ? p.activityDetails.slice(0, 128) : ''
      cleaned.activityState = typeof p.activityState === 'string' ? p.activityState.slice(0, 128) : ''
      cleaned.largeImage = typeof p.largeImage === 'string' ? p.largeImage.slice(0, 256) : ''
      cleaned.largeText = typeof p.largeText === 'string' ? p.largeText.slice(0, 128) : ''
      cleaned.smallImage = typeof p.smallImage === 'string' ? p.smallImage.slice(0, 256) : ''
      cleaned.smallText = typeof p.smallText === 'string' ? p.smallText.slice(0, 128) : ''
      cleaned.button1Label = typeof p.button1Label === 'string' ? p.button1Label.slice(0, 32) : ''
      cleaned.button1Url = typeof p.button1Url === 'string' ? p.button1Url.slice(0, 256) : ''
      cleaned.button2Label = typeof p.button2Label === 'string' ? p.button2Label.slice(0, 32) : ''
      cleaned.button2Url = typeof p.button2Url === 'string' ? p.button2Url.slice(0, 256) : ''
      const pCur = Number(p.partyCurrent); cleaned.partyCurrent = (pCur > 0 && pCur <= 99) ? pCur : null
      const pMax = Number(p.partyMax); cleaned.partyMax = (pMax > 0 && pMax <= 99) ? pMax : null
      update[key] = cleaned
    } else if (key === 'presenceProfiles') {
      if (!Array.isArray(body[key])) continue
      const VALID_STATUSES = ['online', 'idle', 'dnd', 'invisible']
      const VALID_TYPES = ['PLAYING', 'WATCHING', 'LISTENING', 'COMPETING', 'CUSTOM']
      const profiles = body[key]
        .filter((p: any) => p && typeof p === 'object' && typeof p.name === 'string' && p.name.trim().length > 0)
        .slice(0, 30)
        .map((p: any) => {
          const c: Record<string, any> = {}
          c.name = p.name.trim().slice(0, 64)
          c.status = VALID_STATUSES.includes(p.status) ? p.status : 'online'
          c.activityType = VALID_TYPES.includes(p.activityType) ? p.activityType : 'PLAYING'
          c.activityName = typeof p.activityName === 'string' ? p.activityName.slice(0, 128) : ''
          c.activityDetails = typeof p.activityDetails === 'string' ? p.activityDetails.slice(0, 128) : ''
          c.activityState = typeof p.activityState === 'string' ? p.activityState.slice(0, 128) : ''
          c.largeImage = typeof p.largeImage === 'string' ? p.largeImage.slice(0, 256) : ''
          c.largeText = typeof p.largeText === 'string' ? p.largeText.slice(0, 128) : ''
          c.smallImage = typeof p.smallImage === 'string' ? p.smallImage.slice(0, 256) : ''
          c.smallText = typeof p.smallText === 'string' ? p.smallText.slice(0, 128) : ''
          c.button1Label = typeof p.button1Label === 'string' ? p.button1Label.slice(0, 32) : ''
          c.button1Url = typeof p.button1Url === 'string' ? p.button1Url.slice(0, 256) : ''
          c.button2Label = typeof p.button2Label === 'string' ? p.button2Label.slice(0, 32) : ''
          c.button2Url = typeof p.button2Url === 'string' ? p.button2Url.slice(0, 256) : ''
          const pCur = Number(p.partyCurrent); c.partyCurrent = (pCur > 0 && pCur <= 99) ? pCur : null
          const pMax = Number(p.partyMax); c.partyMax = (pMax > 0 && pMax <= 99) ? pMax : null
          return c
        })
      update[key] = profiles
    } else if (key === 'presenceEnabled') {
      update[key] = Boolean(body[key])
    } else if (key === 'geminiApiKey') {
      update[key] = typeof body[key] === 'string' ? body[key] : ''
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
  await setPendingSettingsUpdate(update)

  return { success: true }
})
