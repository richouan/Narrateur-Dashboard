import bcrypt from 'bcryptjs'
import { User } from '~~/server/models/User'
import { createToken, setAuthCookie } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password } = body

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Email and password required' })
  }

  const user = await User.findOne({ email })
  if (!user || !user.passwordHash) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  const token = createToken({ userId: user._id.toString(), role: user.role })
  setAuthCookie(event, token)

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
