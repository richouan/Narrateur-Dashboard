import { requireAuth } from '~~/server/utils/auth'
import { requestFetchUser, getBotState } from '~~/server/utils/discord-bot-state'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const body = await readBody(event)
  const { discordId, gameId } = body

  if (!discordId) {
    throw createError({ statusCode: 400, statusMessage: 'discordId required' })
  }

  // Store gameId in bot state if provided
  if (gameId) {
    const state = await getBotState()
    await requireAuth(event) // ensure user has access before mutating db
    import('~~/server/models/BotState').then(m => {
      m.BotStateModel.updateOne({ id: 'singleton' }, { $set: { 'gameState.gameId': gameId } }).exec()
    })
  }

  // Trigger fetch request for the bot to pick up
  await requestFetchUser(discordId)

  return { success: true, message: 'Fetch request sent to bot' }
})
