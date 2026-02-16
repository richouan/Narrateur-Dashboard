import { WebSocketServer } from 'ws'
import type { IncomingMessage } from 'http'
import type { Duplex } from 'stream'
import { addWSClient } from '../utils/websocket'

let wss: WebSocketServer | null = null

export default defineNitroPlugin((nitro) => {
  // Catch unhandled socket errors to prevent server crashes
  process.on('unhandledRejection', (err: any) => {
    if (err?.code === 'ECONNRESET' || err?.message?.includes('ECONNRESET')) {
      console.warn('[WS] Connection reset (ignored)')
      return
    }
    console.error('[Server] Unhandled rejection:', err)
  })

  // @ts-ignore - access node server after listen
  nitro.hooks.hook('listen', (server: any) => {
    wss = new WebSocketServer({ noServer: true })

    wss.on('error', (err) => {
      console.error('[WS] Server error:', err.message)
    })

    server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
      // Only handle /ws path — let Vite HMR and other upgrades pass through
      if (request.url === '/ws') {
        wss!.handleUpgrade(request, socket, head, (ws) => {
          ws.on('error', (err) => {
            console.error('[WS] Client error:', err.message)
          })
          addWSClient(ws)
        })
      }
      // Do NOT destroy other sockets — they may be Vite HMR
    })

    console.log('[WS] WebSocket server initialized on /ws')
  })
})
