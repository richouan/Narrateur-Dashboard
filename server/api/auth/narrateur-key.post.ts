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

  // Find or create a narrateur system user
  let user = await User.findOne({ role: 'ADMIN', email: 'admin@loupgarou.local' })
  if (!user) {
    user = await User.create({
      username: 'Narrateur',
      email: 'admin@loupgarou.local',
      role: 'ADMIN',
    })
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
