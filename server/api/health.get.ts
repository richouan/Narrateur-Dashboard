import { isDBConnected } from '~~/server/utils/db'

export default defineEventHandler(async () => {
  return {
    status: 'ok',
    timestamp: Date.now(),
    db: isDBConnected() ? 'connected' : 'disconnected',
    uptime: process.uptime(),
  }
})
