import bcrypt from 'bcryptjs'
import { User } from '~~/server/models/User'
import { requireOwner, isOwner } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireOwner(event) // Only owner can change roles/passwords

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { role, password } = body

  // Prevent changing owner's role or password
  const targetUser = await User.findById(id)
  if (!targetUser) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  if (await isOwner(targetUser)) {
    throw createError({ statusCode: 403, statusMessage: 'Cannot modify owner account' })
  }

  // Validate role if provided
  if (role && !['ADMIN', 'NARRATEUR'].includes(role)) {
    throw createError({ statusCode: 400, statusMessage: 'Role must be ADMIN or NARRATEUR' })
  }

  // Update fields
  const updates: any = {}
  if (role) updates.role = role
  if (password) {
    if (password.length < 6) {
      throw createError({ statusCode: 400, statusMessage: 'Le mot de passe doit contenir au moins 6 caractères' })
    }
    updates.passwordHash = await bcrypt.hash(password, 10)
  }

  const user = await (User as any).findByIdAndUpdate(
    id,
    updates,
    { returnDocument: 'after' }
  ).select('-passwordHash')

  return {
    success: true,
    data: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
  }
})
