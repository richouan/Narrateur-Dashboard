// ─── Game Types ──────────────────────────────────────────────

export type UserRole = 'ADMIN' | 'NARRATEUR'
export type Team = 'WOLF' | 'VILLAGER' | 'NEUTRAL'

export type GameStatus =
  | 'SETUP'
  | 'CAPTAIN_APPLICATION'
  | 'CAPTAIN_SPIN'
  | 'CAPTAIN_VOTE'
  | 'FIRST_NIGHT'
  | 'DAY'
  | 'VOTE'
  | 'NIGHT'
  | 'END'

export interface IUser {
  _id: string
  username: string
  email: string
  passwordHash?: string
  discordId?: string
  avatar?: string
  role: UserRole
  createdAt: Date
}

export interface IRole {
  _id: string
  name: string
  team: Team
  description: string
  nightOrder: number
  hasNightAction: boolean
  isUnique: boolean
  icon?: string
  createdAt: Date
}

export interface IGamePlayer {
  id: string
  number?: number
  name: string
  discordId?: string
  avatar?: string
  roleId?: string
  roleName?: string
  isAlive: boolean
  isCaptain: boolean
  isInfected: boolean
}

export interface INightAction {
  role: string
  actor: string
  target: string
  result: string
}

export interface INightLog {
  nightNumber: number
  actions: INightAction[]
}

export interface IVote {
  voter: string
  target: string
  weight: number
}

export interface IVoteLog {
  dayNumber: number
  votes: IVote[]
  result: string
}

export interface IGameLog {
  timestamp: Date
  phase: GameStatus
  message: string
  type: 'info' | 'action' | 'death' | 'system'
}

export interface IGame {
  _id: string
  status: GameStatus
  players: IGamePlayer[]
  selectedRoles?: Record<string, number>
  manualRoleAssignments?: Record<string, boolean>
  captainId?: string
  nightNumber: number
  dayNumber: number
  logs: IGameLog[]
  voteLogs: IVoteLog[]
  nightLogs: INightLog[]
  createdAt: Date
  endedAt?: Date
}

// ─── API Types ───────────────────────────────────────────────

export interface LoginPayload {
  email: string
  password: string
}

export interface NarrateurKeyPayload {
  key: string
}

export interface DiscordSyncPayload {
  players: { discordId: string; username: string }[]
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// ─── WebSocket Types ─────────────────────────────────────────

export type WSEventType =
  | 'phase_change'
  | 'player_update'
  | 'vote_update'
  | 'log_update'
  | 'game_update'
  | 'connection'

export interface WSMessage {
  type: WSEventType
  payload: Record<string, unknown>
  timestamp: number
}

// ─── State Machine Types ─────────────────────────────────────

export const VALID_TRANSITIONS: Record<GameStatus, GameStatus[]> = {
  SETUP: ['CAPTAIN_APPLICATION', 'FIRST_NIGHT', 'END'],
  CAPTAIN_APPLICATION: ['CAPTAIN_SPIN', 'CAPTAIN_VOTE'],
  CAPTAIN_SPIN: ['CAPTAIN_VOTE'],
  CAPTAIN_VOTE: ['FIRST_NIGHT'],
  FIRST_NIGHT: ['DAY'],
  DAY: ['VOTE', 'NIGHT', 'END'],
  VOTE: ['DAY', 'NIGHT', 'END'],
  NIGHT: ['DAY', 'END'],
  END: ['SETUP'],
}
