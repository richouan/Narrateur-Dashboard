import bcrypt from 'bcryptjs'
import { User } from '~~/server/models/User'
import { createToken, setAuthCookie } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { key } = body

  if (!key) {
    throw createError({ statusCode: 400, statusMessage: 'Key required' })
  }

  const config = useRuntimeConfig()
  if (key !== config.narrateurKey) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid narrateur key' })
  }

  // Find or create the owner user
  const hashedKey = await bcrypt.hash(key, 10)
  let user = await User.findOne({ username: 'Owner' })
  
  if (!user) {
    user = await User.create({
      username: 'Owner',
      passwordHash: hashedKey,
      role: 'ADMIN',
    })
  } else {
    // Update password hash in case the key changed
    user.passwordHash = hashedKey
    await user.save()
  }

  const token = createToken({ userId: user._id.toString(), role: user.role })
  setAuthCookie(event, token)

  return {
    success: true,
    data: {
      id: user._id,
      username: user.username,
      role: user.role,
    },
  }
})
