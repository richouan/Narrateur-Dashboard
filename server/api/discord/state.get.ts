import { getBotState } from '~~/server/utils/discord-bot-state'

// Endpoint for self-bot to poll current state
export default defineEventHandler(async () => {
  const state = await getBotState()
  return state
})
