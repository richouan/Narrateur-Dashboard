import mongoose, { Schema, type Document, type Model } from 'mongoose'

export interface IGamePlayer {
  id: string
  number?: number
  name: string
  discordId?: string
  avatar?: string
  roleId?: string
  roleName?: string
  roleTeam?: string
  roleIsUnique?: boolean
  isAlive: boolean
  isCaptain: boolean
  isInfected: boolean
}

export interface IGameLog {
  timestamp: Date
  phase?: string
  message: string
  type: 'info' | 'action' | 'death' | 'system'
}

export interface INightAction {
  role: string
  actor: string
  target?: string
  result?: string
}

export interface INightLog {
  nightNumber: number
  actions: INightAction[]
}

export interface IVote {
  voter: string
  target: string
  weight?: number
}

export interface IVoteLog {
  dayNumber: number
  votes: IVote[]
  result?: string
}

// ─── Sub-schemas ─────────────────────────────────────────────

const GamePlayerSchema = new Schema({
  id: { type: String, required: true },
  number: { type: Number },
  name: { type: String, required: true },
  discordId: { type: String },
  avatar: { type: String },
  roleId: { type: String },
  roleName: { type: String },
  roleTeam: { type: String },
  roleIsUnique: { type: Boolean },
  isAlive: { type: Boolean, default: true },
  isCaptain: { type: Boolean, default: false },
  isInfected: { type: Boolean, default: false },
}, { _id: false })

const NightActionSchema = new Schema({
  role: { type: String, required: true },
  actor: { type: String, required: true },
  target: { type: String, default: '' },
  result: { type: String, default: '' },
}, { _id: false })

const NightLogSchema = new Schema({
  nightNumber: { type: Number, required: true },
  actions: [NightActionSchema],
}, { _id: false })

const VoteSchema = new Schema({
  voter: { type: String, required: true },
  target: { type: String, required: true },
  weight: { type: Number, default: 1 },
}, { _id: false })

const VoteLogSchema = new Schema({
  dayNumber: { type: Number, required: true },
  votes: [VoteSchema],
  result: { type: String },
}, { _id: false })

const GameLogSchema = new Schema({
  timestamp: { type: Date, default: Date.now },
  phase: { type: String },
  message: { type: String, required: true },
  type: { type: String, enum: ['info', 'action', 'death', 'system'], default: 'info' },
}, { _id: false })

const CaptainVoteRoundSchema = new Schema({
  label: { type: String },
  votes: { type: Schema.Types.Mixed, default: {} },
  voterIds: [{ type: String }],
}, { _id: false })

// ─── Main Game Schema ────────────────────────────────────────

export interface IGameDoc extends Document {
  narratorId: string
  status: string
  players: IGamePlayer[]
  selectedRoles?: Record<string, number>
  manualRoleAssignments?: Record<string, boolean>
  captainId?: string
  captainCandidates: string[]
  captainVotes: Record<string, string>
  captainVoteRounds: Array<{ label: string; votes: Record<string, string>; voterIds: string[] }>
  captainVoterFilter: string[]
  spinCandidates: string[]
  spinResult: string[]
  firstNightActions: Record<string, string>
  firstNightDone: Record<string, boolean>
  nightPhaseActions: Record<string, string>
  nightPhaseDone: Record<string, boolean>
  voteDrafts: Record<string, Record<string, string>>
  voteKills: Record<string, string[]>
  nightNumber: number
  dayNumber: number
  logs: IGameLog[]
  voteLogs: IVoteLog[]
  nightLogs: INightLog[]
  createdAt: Date
  endedAt?: Date
}

const GameSchema = new Schema<IGameDoc>({
  narratorId: { type: String, required: true, index: true },
  status: {
    type: String,
    enum: ['SETUP', 'CONFIRMATION', 'CAPTAIN_APPLICATION', 'CAPTAIN_SPIN', 'CAPTAIN_VOTE', 'FIRST_NIGHT', 'DAY', 'VOTE', 'NIGHT', 'END'],
    default: 'SETUP',
  },
  players: [GamePlayerSchema],
  selectedRoles: { type: Map, of: Number, default: {} },
  manualRoleAssignments: { type: Map, of: Boolean, default: {} },
  captainId: { type: String },
  captainCandidates: [{ type: String }],
  captainVotes: { type: Map, of: String, default: {} },
  captainVoteRounds: [CaptainVoteRoundSchema],
  captainVoterFilter: [{ type: String }],
  spinCandidates: [{ type: String }],
  spinResult: [{ type: String }],
  firstNightActions: { type: Map, of: String, default: {} },
  firstNightDone: { type: Map, of: Boolean, default: {} },
  nightPhaseActions: { type: Map, of: String, default: {} },
  nightPhaseDone: { type: Map, of: Boolean, default: {} },
  voteDrafts: { type: Schema.Types.Mixed, default: {} },
  voteKills: { type: Schema.Types.Mixed, default: {} },
  nightNumber: { type: Number, default: 0 },
  dayNumber: { type: Number, default: 0 },
  logs: [GameLogSchema],
  voteLogs: [VoteLogSchema],
  nightLogs: [NightLogSchema],
  createdAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
})

export const Game = (mongoose.models.Game as Model<IGameDoc>) || mongoose.model<IGameDoc>('Game', GameSchema)
