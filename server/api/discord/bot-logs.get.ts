/**
 * GET /api/discord/bot-logs?limit=200
 * 
 * Returns recent bot activity logs from memory (ring buffer).
 * No disk I/O — instant response.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const limit = Math.min(Number(query.limit) || 200, 500)

  try {
    // Dynamic import so it doesn't break if the bot module isn't available
    const { getBotLogs } = await import('../../../discord-bot/selfbot.js')
    const logs = getBotLogs(limit)
    return { ok: true, count: logs.length, logs }
  } catch (error: any) {
    // Bot not running or not embedded — try to read from log file instead
    try {
      const { readFileSync } = await import('fs')
      const { resolve } = await import('path')
      const logFile = resolve(process.cwd(), 'discord-bot', 'logs', 'activity.jsonl')
      const content = readFileSync(logFile, 'utf-8')
      const lines = content.trim().split('\n').filter(Boolean)
      const logs = lines
        .slice(-limit)
        .reverse()
        .map((line) => {
          try { return JSON.parse(line) } catch { return null }
        })
        .filter(Boolean)
      return { ok: true, count: logs.length, source: 'file', logs }
    } catch {
      return { ok: false, count: 0, logs: [], message: 'Bot not running and no log file found' }
    }
  }
})
