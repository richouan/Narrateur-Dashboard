import { Role } from '~~/server/models/Role'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const role = await Role.findByIdAndUpdate(id, body, { new: true })
  if (!role) {
    throw createError({ statusCode: 404, statusMessage: 'Role not found' })
  }

  return { success: true, data: role }
})
