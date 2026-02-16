import { User } from '~~/server/models/User'
import { requireAuth, isOwner } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const { userId } = requireAuth(event)

  // Fetch user WITH passwordHash to check owner status
  const user = await User.findById(userId)
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  // Check if user is owner
  const userIsOwner = await isOwner(user)

  return {
    success: true,
    data: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      isOwner: userIsOwner,
    },
  }
})
