import { Role } from '~~/server/models/Role'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const query = getQuery(event)
  const filter: Record<string, unknown> = {}

  if (query.team) {
    filter.team = query.team
  }

  const roles = await Role.find(filter).sort({ nightOrder: 1 })

  return {
    success: true,
    data: roles,
  }
})
