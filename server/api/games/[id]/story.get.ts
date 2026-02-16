import { Game } from '~~/server/models/Game'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const id = getRouterParam(event, 'id')

  const game = await Game.findById(id)
  if (!game) {
    throw createError({ statusCode: 404, statusMessage: 'Game not found' })
  }

  // Generate narrative story from logs
  const lines: string[] = []
  lines.push('═══════════════════════════════════════')
  lines.push('     LOUP GAROU — GAME CHRONICLE')
  lines.push('═══════════════════════════════════════')
  lines.push('')

  // Group logs by phase/night/day
  let currentNight = 0
  let currentDay = 0

  for (const log of game.logs) {
    if (log.phase === 'NIGHT' || log.phase === 'FIRST_NIGHT') {
      const nightNum = log.phase === 'FIRST_NIGHT' ? 1 : game.nightNumber
      if (nightNum !== currentNight) {
        currentNight = nightNum
        lines.push('')
        lines.push(`🌙 Night ${currentNight}`)
        lines.push('───────────────────')
      }
    }

    if (log.phase === 'DAY') {
      const dayNum = game.dayNumber
      if (dayNum !== currentDay) {
        currentDay = dayNum
        lines.push('')
        lines.push(`☀️ Day ${currentDay}`)
        lines.push('───────────────────')
      }
    }

    if (log.type === 'death') {
      lines.push(`  💀 ${log.message}`)
    } else if (log.type === 'action') {
      lines.push(`  ⚔️ ${log.message}`)
    } else if (log.type !== 'system') {
      lines.push(`  📜 ${log.message}`)
    }
  }

  lines.push('')
  lines.push('═══════════════════════════════════════')
  lines.push(`  Game ended: ${game.endedAt ? new Date(game.endedAt).toLocaleString() : 'In progress'}`)
  lines.push('═══════════════════════════════════════')

  return {
    success: true,
    data: {
      story: lines.join('\n'),
      game,
    },
  }
})
