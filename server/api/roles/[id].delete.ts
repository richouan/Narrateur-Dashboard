import { Role } from '~~/server/models/Role'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const id = getRouterParam(event, 'id')

  const role = await Role.findByIdAndDelete(id)
  if (!role) {
    throw createError({ statusCode: 404, statusMessage: 'Role not found' })
  }

  return { success: true }
})
