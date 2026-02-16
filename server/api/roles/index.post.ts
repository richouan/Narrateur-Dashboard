import { Role } from '~~/server/models/Role'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const body = await readBody(event)
  const { name, team, description, nightOrder, hasNightAction, isUnique, icon } = body

  if (!name || !team || !description) {
    throw createError({ statusCode: 400, statusMessage: 'Name, team, and description are required' })
  }

  const existing = await Role.findOne({ name })
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Role already exists' })
  }

  const role = await Role.create({
    name,
    team,
    description,
    nightOrder: nightOrder ?? 99,
    hasNightAction: hasNightAction ?? false,
    isUnique: isUnique ?? true,
    icon,
  })

  return { success: true, data: role }
})
