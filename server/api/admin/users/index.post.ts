import bcrypt from 'bcryptjs'
import { User } from '~~/server/models/User'
import { requireOwner } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireOwner(event) // Only owner can create users

  const body = await readBody(event)
  const { username, password, role } = body

  if (!username || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Username and password are required' })
  }

  if (!['ADMIN', 'NARRATEUR'].includes(role)) {
    throw createError({ statusCode: 400, statusMessage: 'Role must be ADMIN or NARRATEUR' })
  }

  // Check if user already exists
  const existing = await User.findOne({ username })
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'User with this username already exists' })
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10)

  // Create user
  const user = await User.create({
    username,
    passwordHash,
    role,
  })

  return {
    success: true,
    data: {
      id: user._id,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
    },
  }
})
