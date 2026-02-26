import { updateHeartbeat } from '~~/server/utils/discord-bot-state'

export default defineEventHandler(async () => {
  await updateHeartbeat()
  return { success: true, timestamp: Date.now() }
})
