import { updateHeartbeat } from '~~/server/utils/discord-bot-state'

export default defineEventHandler(async () => {
  updateHeartbeat()
  return { success: true, timestamp: Date.now() }
})
