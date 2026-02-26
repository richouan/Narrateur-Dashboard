import { BotStateModel } from '../models/BotState'

export interface BotProfile {
  id: string
  username: string
  displayName: string
  avatar: string | null
  banner: string | null
}

async function getStateDoc() {
  return await BotStateModel.findOneAndUpdate(
    { id: 'singleton' },
    { $setOnInsert: { id: 'singleton' } },
    { upsert: true, new: true }
  )
}

export async function getBotState() {
  const doc = await getStateDoc()

  // Auto-consume pendingSettingsUpdate so the bot only processes it once
  const pending = doc.pendingSettingsUpdate
  if (pending) {
    await BotStateModel.updateOne({ id: 'singleton' }, { $set: { pendingSettingsUpdate: null } })
  }

  return {
    bot: {
      scanRequest: doc.scanRequest,
      fetchRequests: doc.fetchRequests,
      lastHeartbeat: doc.lastHeartbeat,
      pendingSettingsUpdate: pending
    },
    game: doc.gameState || {},
  }
}

export async function requestScan(channelId: string, gameId?: string) {
  await BotStateModel.updateOne({ id: 'singleton' }, {
    $set: {
      scanRequest: true,
      'gameState.channelId': channelId,
      ...(gameId ? { 'gameState.gameId': gameId } : {})
    }
  }, { upsert: true })
}

export async function clearScanRequest() {
  await BotStateModel.updateOne({ id: 'singleton' }, { $set: { scanRequest: false } })
}

export async function requestFetchUser(discordId: string) {
  await BotStateModel.updateOne({ id: 'singleton' }, { $addToSet: { fetchRequests: discordId } }, { upsert: true })
}

export async function clearFetchRequest(discordId: string) {
  await BotStateModel.updateOne({ id: 'singleton' }, { $pull: { fetchRequests: discordId } })
}

export async function setGameChannel(channelId: string, channelName: string, guildId: string, guildName: string, guildIcon: string, gameId: string) {
  await BotStateModel.updateOne({ id: 'singleton' }, {
    $set: {
      gameState: { channelId, channelName, guildId, guildName, guildIcon, gameId }
    }
  }, { upsert: true })
}

export async function clearGameChannel() {
  await BotStateModel.updateOne({ id: 'singleton' }, { $set: { gameState: {} } })
}

export async function updateHeartbeat() {
  await BotStateModel.updateOne({ id: 'singleton' }, { $set: { lastHeartbeat: Date.now() } }, { upsert: true })
}

export async function setPendingSettingsUpdate(update: Record<string, any>) {
  const doc = await getStateDoc()
  const existing = doc.pendingSettingsUpdate || {}
  await BotStateModel.updateOne({ id: 'singleton' }, { $set: { pendingSettingsUpdate: { ...existing, ...update } } })
}

export async function isBotAlive(): Promise<boolean> {
  const doc = await getStateDoc()
  return Date.now() - (doc.lastHeartbeat || 0) < 15000 // 15 seconds
}

// Pending scan results management
export async function setPendingScanResults(results: any[]) {
  await BotStateModel.updateOne({ id: 'singleton' }, { $set: { pendingScanResults: results } }, { upsert: true })
}

export async function getPendingScanResults() {
  const doc = await getStateDoc()
  return doc.pendingScanResults || []
}

export async function clearPendingScanResults() {
  await BotStateModel.updateOne({ id: 'singleton' }, { $set: { pendingScanResults: [] } })
}

export async function setBotProfile(profile: BotProfile) {
  await BotStateModel.updateOne({ id: 'singleton' }, { $set: { botProfile: profile } }, { upsert: true })
}

export async function getCachedBotProfile(): Promise<BotProfile | null> {
  const doc = await getStateDoc()
  return doc.botProfile || null
}

export async function setTargetProfile(profile: BotProfile) {
  await BotStateModel.updateOne({ id: 'singleton' }, { $set: { targetProfile: profile } }, { upsert: true })
}

export async function getCachedTargetProfile(): Promise<BotProfile | null> {
  const doc = await getStateDoc()
  return doc.targetProfile || null
}
