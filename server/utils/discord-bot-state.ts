// Discord Bot State Management
// Stores scan requests and fetch requests for the self-bot to poll

interface BotState {
  scanRequest: boolean
  fetchRequests: string[] // Discord IDs to fetch
  lastHeartbeat: number
}

interface GameState {
  channelId?: string
  channelName?: string
  guildId?: string
  guildName?: string
  guildIcon?: string
  gameId?: string
}

interface PendingScanResult {
  discordId: string
  username: string
  displayName?: string
  avatar: string
}

// In-memory state (could be moved to Redis for production)
let botState: BotState = {
  scanRequest: false,
  fetchRequests: [],
  lastHeartbeat: 0,
}

let gameState: GameState = {}

let pendingScanResults: PendingScanResult[] = []

export function getBotState() {
  return { bot: botState, game: gameState }
}

export function requestScan(channelId: string, gameId?: string) {
  botState.scanRequest = true
  gameState.channelId = channelId
  if (gameId) {
    gameState.gameId = gameId
  }
}

export function clearScanRequest() {
  botState.scanRequest = false
}

export function requestFetchUser(discordId: string) {
  if (!botState.fetchRequests.includes(discordId)) {
    botState.fetchRequests.push(discordId)
  }
}

export function clearFetchRequest(discordId: string) {
  botState.fetchRequests = botState.fetchRequests.filter(id => id !== discordId)
}

export function setGameChannel(channelId: string, channelName: string, guildId: string, guildName: string, guildIcon: string, gameId: string) {
  gameState = { channelId, channelName, guildId, guildName, guildIcon, gameId }
}

export function clearGameChannel() {
  gameState = {}
}

export function updateHeartbeat() {
  botState.lastHeartbeat = Date.now()
}

export function isBotAlive(): boolean {
  return Date.now() - botState.lastHeartbeat < 15000 // 15 seconds
}

// Pending scan results management
export function setPendingScanResults(results: PendingScanResult[]) {
  pendingScanResults = results
}

export function getPendingScanResults() {
  return pendingScanResults
}

export function clearPendingScanResults() {
  pendingScanResults = []
}
