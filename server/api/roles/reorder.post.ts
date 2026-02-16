import { Role } from '~~/server/models/Role'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const body = await readBody(event)
  const { order } = body // Array of { id, nightOrder }

  if (!Array.isArray(order)) {
    throw createError({ statusCode: 400, statusMessage: 'Order array required' })
  }

  const bulkOps = order.map((item: { id: string; nightOrder: number }) => ({
    updateOne: {
      filter: { _id: item.id },
      update: { nightOrder: item.nightOrder },
    },
  }))

  await Role.bulkWrite(bulkOps)

  return { success: true }
})
