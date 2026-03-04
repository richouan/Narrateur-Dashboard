import { setTargetProfile, type BotProfile } from '~~/server/utils/discord-bot-state'
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

  // Save to global BotState slot (legacy, used by bot UI)
  await setTargetProfile(profile)

  // Also save directly to the matching User document by discordId
  // This ensures each user gets their own avatar/banner, not a shared global slot
  await connectDB()
  await User.updateOne(
    { discordId: profile.id },
    {
      $set: {
        avatar: profile.avatar || undefined,
        banner: profile.banner || undefined,
        discordDisplayName: profile.displayName || undefined,
      }
    }
  )

  return { success: true }
})
