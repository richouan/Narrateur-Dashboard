import mongoose, { Schema, type Document } from 'mongoose'

export interface IUserDoc extends Document {
  username: string
  email?: string
  passwordHash?: string
  discordId?: string
  avatar?: string
  role: 'ADMIN' | 'NARRATEUR'
  createdAt: Date
}

const UserSchema = new Schema<IUserDoc>({
  username: { type: String, required: true, unique: true },
  email:    { type: String },
  passwordHash: { type: String },
  discordId: { type: String, unique: true, sparse: true },
  avatar:   { type: String },
  role:     { type: String, enum: ['ADMIN', 'NARRATEUR'], default: 'NARRATEUR' },
  createdAt: { type: Date, default: Date.now },
})

export const User = mongoose.models.User || mongoose.model<IUserDoc>('User', UserSchema)
