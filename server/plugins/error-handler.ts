// Register IMMEDIATELY — before any async work
function isSocketError(err: any): boolean {
  const code = err?.code || ''
  const msg = err?.message || String(err)
  return (
    code === 'ECONNRESET' ||
    code === 'EPIPE' ||
    code === 'ECONNABORTED' ||
    code === 'ERR_STREAM_DESTROYED' ||
    msg.includes('ECONNRESET') ||
    msg.includes('EPIPE') ||
    msg.includes('socket hang up') ||
    msg.includes('aborted')
  )
}

process.on('unhandledRejection', (err: any) => {
  if (isSocketError(err)) return
  console.error('[Server] Unhandled rejection:', err?.message || err)
})

process.on('uncaughtException', (err: any) => {
  if (isSocketError(err)) return
  console.error('[Server] Uncaught exception:', err?.message || err)
})

export default defineNitroPlugin(() => {
  // Handlers already registered at module scope above
})
