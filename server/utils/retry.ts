/**
 * Retry helper for handling Mongoose version conflicts (optimistic concurrency control)
 * 
 * @param operation - Async function that performs the database operation
 * @param maxRetries - Maximum number of retry attempts (default: 5)
 * @returns The result of the operation
 */
export async function retryOnVersionConflict<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5
): Promise<T> {
  let attempt = 0
  let lastError: any = null

  while (attempt < maxRetries) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error

      // Check if it's a version conflict error
      if (error.name === 'VersionError') {
        attempt++
        if (attempt < maxRetries) {
          // Exponential backoff with jitter: 100ms, 200ms, 400ms, 800ms, 1600ms
          const baseDelay = 100 * Math.pow(2, attempt - 1)
          const jitter = Math.random() * 50 // Add 0-50ms random jitter to avoid thundering herd
          await new Promise(resolve => setTimeout(resolve, baseDelay + jitter))
          continue
        }
      }

      // Not a version error or max retries reached - rethrow
      throw error
    }
  }

  // If we get here, all retries failed
  throw createError({
    statusCode: 409,
    statusMessage: 'Update conflict after multiple retries - please try again',
    data: lastError
  })
}
