import { clearScanRequest, setPendingScanResults } from '~~/server/utils/discord-bot-state'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { players } = body // Array of { discordId, username, displayName, avatar }

  if (!Array.isArray(players)) {
    throw createError({ statusCode: 400, statusMessage: 'players array required' })
  }

  // Store results for user to review and select
  await setPendingScanResults(players)

  // Clear the scan request
  await clearScanRequest()

  console.log(`✅ Stored ${players.length} scanned players for selection`)

  return { success: true, playersFound: players.length }
})
