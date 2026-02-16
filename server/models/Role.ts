import mongoose, { Schema, type Document } from 'mongoose'

export interface IRoleDoc extends Document {
  name: string
  team: 'WOLF' | 'VILLAGER' | 'NEUTRAL'
  description: string
  nightOrder: number
  hasNightAction: boolean
  isUnique: boolean
  icon?: string
  createdAt: Date
}

const RoleSchema = new Schema<IRoleDoc>({
  name:           { type: String, required: true, unique: true },
  team:           { type: String, enum: ['WOLF', 'VILLAGER', 'NEUTRAL'], required: true },
  description:    { type: String, required: true },
  nightOrder:     { type: Number, required: true, default: 99 },
  hasNightAction: { type: Boolean, default: false },
  isUnique:       { type: Boolean, default: true },
  icon:           { type: String },
  createdAt:      { type: Date, default: Date.now },
})

export const Role = mongoose.models.Role || mongoose.model<IRoleDoc>('Role', RoleSchema)
