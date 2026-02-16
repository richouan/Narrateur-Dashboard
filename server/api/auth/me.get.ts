import { User } from '~~/server/models/User'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const { userId } = requireAuth(event)

  const user = await User.findById(userId).select('-passwordHash')
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  return {
    success: true,
    data: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    },
  }
})
