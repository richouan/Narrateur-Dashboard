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
    const state = getBotState()
    state.game.gameId = gameId
  }
  
  // Trigger fetch request for the bot to pick up
  requestFetchUser(discordId)
  
  return { success: true, message: 'Fetch request sent to bot' }
})
