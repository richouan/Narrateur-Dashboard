import { User } from '~~/server/models/User'
import { createToken, setAuthCookie } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const { password } = await readBody(event)

  if (!password) {
    throw createError({ statusCode: 400, statusMessage: 'Mot de passe requis' })
  }

  const config = useRuntimeConfig()
  const bcrypt = (await import('bcryptjs')).default

  // Check if it's the owner key
  if (password === config.narrateurKey) {
    // Find or create owner account
    let owner = await User.findOne({ username: 'Owner' })
    
    if (!owner) {
      const hashedKey = await bcrypt.hash(password, 10)
      owner = await User.create({
        username: 'Owner',
        passwordHash: hashedKey,
        role: 'ADMIN'
      })
    } else {
      // Update password hash to match current key
      owner.passwordHash = await bcrypt.hash(password, 10)
      await owner.save()
    }

    const token = createToken({ userId: owner._id.toString(), role: owner.role })
    setAuthCookie(event, token)
    
    return {
      success: true,
      data: {
        id: owner._id,
        username: owner.username,
        email: owner.email,
        role: owner.role,
        avatar: owner.avatar
      }
    }
  }

  // It's not the owner key, so search for a user with matching password
  const users = await User.find({})
  
  for (const user of users) {
    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (isMatch) {
      const token = createToken({ userId: user._id.toString(), role: user.role })
      setAuthCookie(event, token)
      
      return {
        success: true,
        data: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          avatar: user.avatar
        }
      }
    }
  }

  throw createError({ statusCode: 401, statusMessage: 'Mot de passe invalide' })
})
