import { setBotProfile, type BotProfile } from '~~/server/utils/discord-bot-state'

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

  await setBotProfile(profile)
  return { success: true }
})
