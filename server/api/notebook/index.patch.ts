import { requireAuth } from '~~/server/utils/auth'
import { User } from '~~/server/models/User'

interface NotebookPage { id: string; title: string; content: string }

export default defineEventHandler(async (event) => {
  const { userId } = requireAuth(event)
  const body = await readBody<{ pages: NotebookPage[] }>(event)

  if (!Array.isArray(body?.pages)) {
    throw createError({ statusCode: 400, statusMessage: 'pages must be an array' })
  }

  // 500KB sanity cap across all pages combined
  const totalSize = body.pages.reduce((sum, p) => sum + (p.content?.length ?? 0) + (p.title?.length ?? 0), 0)
  if (totalSize > 500_000) {
    throw createError({ statusCode: 413, statusMessage: 'Notebook content too large' })
  }

  await User.updateOne(
    { _id: userId },
    { $set: { notebookPages: body.pages, notebookUpdatedAt: new Date() } }
  )

  return { success: true }
})
