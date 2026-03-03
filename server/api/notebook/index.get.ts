import { requireAuth } from '~~/server/utils/auth'
import { User } from '~~/server/models/User'

export default defineEventHandler(async (event) => {
  const { userId } = requireAuth(event)
  const user = await User.findById(userId).select('notebookContent notebookPages').lean()
  if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  // If pages already exist return them; otherwise migrate from legacy single content
  if (user.notebookPages && user.notebookPages.length > 0) {
    return { success: true, pages: user.notebookPages }
  }

  // Migration: wrap legacy content into page 1
  const legacyContent = user.notebookContent ?? ''
  const pages = [{ id: '1', title: 'Page 1', content: legacyContent }]
  return { success: true, pages }
})
