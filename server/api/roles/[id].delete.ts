import { Role } from '~~/server/models/Role'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const id = getRouterParam(event, 'id')

  const role = await Role.findByIdAndDelete(id)
  if (!role) {
    throw createError({ statusCode: 404, statusMessage: 'Role not found' })
  }

  return { success: true }
})
