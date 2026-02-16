import mongoose, { Schema, type Document } from 'mongoose'

// ─── Sub-schemas ─────────────────────────────────────────────

const GamePlayerSchema = new Schema({
  id:         { type: String, required: true },
  name:       { type: String, required: true },
  discordId:  { type: String },
  roleId:     { type: String },
  roleName:   { type: String },
  isAlive:    { type: Boolean, default: true },
  isCaptain:  { type: Boolean, default: false },
  isInfected: { type: Boolean, default: false },
}, { _id: false })

const NightActionSchema = new Schema({
  role:   { type: String, required: true },
  actor:  { type: String, required: true },
  target: { type: String, required: true },
  result: { type: String, required: true },
}, { _id: false })

const NightLogSchema = new Schema({
  nightNumber: { type: Number, required: true },
  actions:     [NightActionSchema],
}, { _id: false })

const VoteSchema = new Schema({
  voter:  { type: String, required: true },
  target: { type: String, required: true },
  weight: { type: Number, default: 1 },
}, { _id: false })

const VoteLogSchema = new Schema({
  dayNumber: { type: Number, required: true },
  votes:     [VoteSchema],
  result:    { type: String },
}, { _id: false })

const GameLogSchema = new Schema({
  timestamp: { type: Date, default: Date.now },
  phase:     { type: String },
  message:   { type: String, required: true },
  type:      { type: String, enum: ['info', 'action', 'death', 'system'], default: 'info' },
}, { _id: false })

// ─── Main Game Schema ────────────────────────────────────────

export interface IGameDoc extends Document {
  narratorId: string
  status: string
  players: typeof GamePlayerSchema[]
  captainId?: string
  nightNumber: number
  dayNumber: number
  logs: typeof GameLogSchema[]
  voteLogs: typeof VoteLogSchema[]
  nightLogs: typeof NightLogSchema[]
  createdAt: Date
  endedAt?: Date
}

const GameSchema = new Schema({
  narratorId: { type: String, required: true, index: true },
  status: {
    type: String,
    enum: ['SETUP', 'CAPTAIN_APPLICATION', 'CAPTAIN_SPIN', 'CAPTAIN_VOTE', 'FIRST_NIGHT', 'DAY', 'VOTE', 'NIGHT', 'END'],
    default: 'SETUP',
  },
  players:     [GamePlayerSchema],
  captainId:   { type: String },
  nightNumber: { type: Number, default: 0 },
  dayNumber:   { type: Number, default: 0 },
  logs:        [GameLogSchema],
  voteLogs:    [VoteLogSchema],
  nightLogs:   [NightLogSchema],
  createdAt:   { type: Date, default: Date.now },
  endedAt:     { type: Date },
})

export const Game = mongoose.models.Game || mongoose.model('Game', GameSchema)
