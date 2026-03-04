import { setBotProfile, type BotProfile } from '~~/server/utils/discord-bot-state'
import { connectDB } from '~~/server/utils/db'
import { User } from '~~/server/models/User'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.id || !body?.username) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid profile payload' })
  }

  const profile: BotProfile = {
    id: String(body.id),
    username: String(body.username),
    displayName: String(body.displayName || body.username),
    avatar: body.avatar || null,
    banner: body.banner || null,
  }

  // Global slot (legacy)
  await setBotProfile(profile)

  // Save per-user: find the stalked user for THIS server instance and attach the selfbot profile to them
  const config = useRuntimeConfig()
  if (config.stalkUserId) {
    await connectDB()
    await User.updateOne(
      { discordId: config.stalkUserId },
      { $set: { selfbotProfile: profile } }
    )
  }

  return { success: true }
})
