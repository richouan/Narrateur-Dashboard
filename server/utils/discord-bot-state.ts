// Discord Bot State Management
// Stores scan requests and fetch requests for the self-bot to poll

interface BotState {
  scanRequest: boolean
  fetchRequests: string[]
  lastHeartbeat: number
  pendingSettingsUpdate: Record<string, any> | null
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

export interface BotProfile {
  id: string
  username: string
  displayName: string
  avatar: string | null
  banner: string | null
}

// In-memory state (could be moved to Redis for production)
let botState: BotState = {
  scanRequest: false,
  fetchRequests: [],
  lastHeartbeat: 0,
  pendingSettingsUpdate: null,
}

let gameState: GameState = {}

let pendingScanResults: PendingScanResult[] = []

let botProfile: BotProfile | null = null
let targetProfile: BotProfile | null = null

export function getBotState() {
  // Auto-consume pendingSettingsUpdate so the bot only processes it once
  const pending = botState.pendingSettingsUpdate
  if (pending) botState.pendingSettingsUpdate = null
  return {
    bot: { ...botState, pendingSettingsUpdate: pending },
    game: gameState,
  }
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

export function setPendingSettingsUpdate(update: Record<string, any>) {
  // Merge with any existing pending update (in case two saves happen before the bot polls)
  botState.pendingSettingsUpdate = { ...(botState.pendingSettingsUpdate || {}), ...update }
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

export function setBotProfile(profile: BotProfile) {
  botProfile = profile
}

export function getCachedBotProfile(): BotProfile | null {
  return botProfile
}

export function setTargetProfile(profile: BotProfile) {
  targetProfile = profile
}

export function getCachedTargetProfile(): BotProfile | null {
  return targetProfile
}
