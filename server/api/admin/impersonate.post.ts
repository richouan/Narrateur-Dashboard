import { requireOwner, createToken, setAuthCookie, getAuthCookie } from '~~/server/utils/auth'
import { User } from '~~/server/models/User'
import { connectDB } from '~~/server/utils/db'
import { setCookie } from 'h3'

export default defineEventHandler(async (event) => {
  await requireOwner(event)
  await connectDB()

  const { userId } = await readBody<{ userId: string }>(event)
  if (!userId) throw createError({ statusCode: 400, statusMessage: 'userId required' })

  const target = await User.findById(userId)
  if (!target) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  // Save the owner's current token so they can return
  const ownerToken = getAuthCookie(event)
  if (ownerToken) {
    setCookie(event, 'lg_owner_token', ownerToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 2, // 2h max impersonation window
      path: '/',
    })
  }

  // Set the target user's token as the main auth cookie
  const token = createToken({ userId: target._id.toString(), role: target.role })
  setAuthCookie(event, token)

  return { success: true, username: target.username }
})
