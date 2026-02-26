import { requireAuth } from '~~/server/utils/auth'
import { requestScan, setGameChannel } from '~~/server/utils/discord-bot-state'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const body = await readBody(event)
  const { channelId, gameId } = body

  if (!channelId || !gameId) {
    throw createError({ statusCode: 400, statusMessage: 'channelId and gameId required' })
  }

  // Trigger scan request for the bot to pick up
  await requestScan(channelId, gameId)

  return { success: true, message: 'Scan request sent to bot' }
})
