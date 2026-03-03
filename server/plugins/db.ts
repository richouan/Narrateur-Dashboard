import { connectDB } from '../utils/db'

/**
 * Nitro plugin — connects to MongoDB at server startup.
 * Without this, the first request would pay the connection cost (~200-500ms).
 * With this, the pool is warm before any user hits the API.
 */
export default defineNitroPlugin(async (_nitro) => {
  try {
    await connectDB()
  } catch (e) {
    console.error('[DB] Startup connection failed — will retry on first request', e)
  }
})
