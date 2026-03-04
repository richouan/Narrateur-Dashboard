import { requireAuth } from '~~/server/utils/auth'
import { connectDB } from '~~/server/utils/db'
import { User } from '~~/server/models/User'

export default defineEventHandler(async (event) => {
  const { userId } = requireAuth(event)

  await connectDB()
  const user = await User.findById(userId).lean()
  if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  // Return the selfbot profile stored on this user's own doc (written by their selfbot instance)
  return { success: true, data: user.selfbotProfile || null }
})

