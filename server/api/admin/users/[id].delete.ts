import { User } from '~~/server/models/User'
import { Game } from '~~/server/models/Game'
import { requireOwner, isOwner } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireOwner(event) // Only owner can delete users

  const id = getRouterParam(event, 'id')

  const targetUser = await User.findById(id)
  if (!targetUser) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  // Prevent deleting the owner
  if (await isOwner(targetUser)) {
    throw createError({ statusCode: 403, statusMessage: 'Cannot delete owner account' })
  }

  // Delete all games associated with this user (cascade delete)
  const deleteResult = await Game.deleteMany({ narratorId: id } as any)
  
  // Delete the user
  await (User as any).findByIdAndDelete(id)

  return { 
    success: true, 
    message: `User deleted successfully${deleteResult.deletedCount > 0 ? ` along with ${deleteResult.deletedCount} game(s)` : ''}` 
  }
})
