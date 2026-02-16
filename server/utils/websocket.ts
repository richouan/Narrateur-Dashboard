import type { WebSocket } from 'ws'

// Store connected clients
const clients = new Set<WebSocket>()

export function addWSClient(ws: WebSocket): void {
  clients.add(ws)
  console.log(`[WS] Client connected. Total: ${clients.size}`)

  ws.on('close', () => {
    clients.delete(ws)
    console.log(`[WS] Client disconnected. Total: ${clients.size}`)
  })

  ws.on('error', (err) => {
    console.error('[WS] Client error:', err.message)
    clients.delete(ws)
  })

  // Send welcome message
  try {
    ws.send(JSON.stringify({
      type: 'connection',
      payload: { message: 'Connected to Loup Garou WebSocket' },
      timestamp: Date.now(),
    }))
  } catch {
    // Client already disconnected
  }
}

export function broadcastGameUpdate(game: any): void {
  const message = JSON.stringify({
    type: 'game_update',
    payload: {
      gameId: game._id,
      status: game.status,
      players: game.players,
      captainId: game.captainId,
      nightNumber: game.nightNumber,
      dayNumber: game.dayNumber,
    },
    timestamp: Date.now(),
  })

  for (const client of clients) {
    if (client.readyState === 1) { // WebSocket.OPEN
      try {
        client.send(message)
      } catch {
        clients.delete(client)
      }
    }
  }
}

export function broadcastPhaseChange(gameId: string, phase: string): void {
  const message = JSON.stringify({
    type: 'phase_change',
    payload: { gameId, phase },
    timestamp: Date.now(),
  })

  for (const client of clients) {
    if (client.readyState === 1) {
      try {
        client.send(message)
      } catch {
        clients.delete(client)
      }
    }
  }
}

export function broadcastVoteUpdate(gameId: string, votes: any): void {
  const message = JSON.stringify({
    type: 'vote_update',
    payload: { gameId, votes },
    timestamp: Date.now(),
  })

  for (const client of clients) {
    if (client.readyState === 1) {
      try {
        client.send(message)
      } catch {
        clients.delete(client)
      }
    }
  }
}

export function getConnectedClients(): number {
  return clients.size
}
