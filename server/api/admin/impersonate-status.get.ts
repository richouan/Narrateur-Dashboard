import { verifyToken } from '~~/server/utils/auth'
import { getCookie } from 'h3'
import { User } from '~~/server/models/User'
import { connectDB } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const ownerToken = getCookie(event, 'lg_owner_token')
  if (!ownerToken) return { active: false }

  const payload = verifyToken(ownerToken)
  if (!payload) return { active: false }

  await connectDB()
  const owner = await User.findById(payload.userId).select('username').lean()

  return {
    active: true,
    ownerUsername: owner?.username ?? 'Owner',
  }
})
