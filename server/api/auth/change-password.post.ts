import bcrypt from 'bcryptjs'
import { User } from '~~/server/models/User'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { currentPassword, newPassword } = await readBody(event)

  if (!currentPassword || !newPassword) {
    throw createError({ statusCode: 400, statusMessage: 'Current and new password required' })
  }

  if (newPassword.length < 6) {
    throw createError({ statusCode: 400, statusMessage: 'Le mot de passe doit contenir au moins 6 caractères' })
  }

  // Fetch the full user with password hash
  const fullUser = await User.findById(user.userId)
  if (!fullUser || !fullUser.passwordHash) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  // Verify current password
  const isValid = await bcrypt.compare(currentPassword, fullUser.passwordHash)
  if (!isValid) {
    throw createError({ statusCode: 401, statusMessage: 'Mot de passe actuel incorrect' })
  }

  // Hash and save new password
  const hashedPassword = await bcrypt.hash(newPassword, 10)
  fullUser.passwordHash = hashedPassword
  await fullUser.save()

  return { success: true, message: 'Mot de passe modifié avec succès' }
})
