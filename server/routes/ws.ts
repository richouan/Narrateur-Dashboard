// Catch /ws requests before they hit Vue Router SSR
// Returns 426 Upgrade Required for normal HTTP requests to /ws
export default defineEventHandler((event) => {
  // If this is a normal HTTP request (not an upgrade), respond gracefully
  setResponseStatus(event, 426)
  return { error: 'WebSocket endpoint — use ws:// protocol' }
})
