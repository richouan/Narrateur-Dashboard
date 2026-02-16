export function useWebSocket() {
  const ws = ref<WebSocket | null>(null)
  const connected = ref(false)

  // WebSocket disabled during development — enable server/plugins/websocket.ts to activate
  function connect() {
    // No-op for now
  }

  function disconnect() {
    ws.value?.close()
    ws.value = null
    connected.value = false
  }

  return { ws, connected, connect, disconnect }
}
