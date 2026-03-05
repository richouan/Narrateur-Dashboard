import { User } from '~~/server/models/User'
import { requireOwner, isOwner } from '~~/server/utils/auth'
import { connectDB } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  await requireOwner(event) // Only owner can view all users
  await connectDB()

  // Fetch WITH passwordHash so isOwner() can do the bcrypt check
  const users = await User.find().sort({ createdAt: -1 })

  // Mark which user is the owner
  const usersWithOwner = await Promise.all(
    users.map(async (u) => ({
      id: u._id,
      username: u.username,
      email: u.email,
      role: u.role,
      avatar: u.avatar,
      discordId: u.discordId,
      createdAt: u.createdAt,
      isOwner: await isOwner(u),
    }))
  )

  return {
    success: true,
    data: usersWithOwner,
  }
})
