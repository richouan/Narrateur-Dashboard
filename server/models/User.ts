import mongoose, { Schema, type Document } from 'mongoose'

export interface INotebookPage {
  id: string
  title: string
  content: string
}

export interface IUserDoc extends Document {
  username: string
  email?: string
  passwordHash?: string
  discordId?: string
  avatar?: string
  role: 'ADMIN' | 'NARRATEUR'
  createdAt: Date
  notebookContent?: string
  notebookUpdatedAt?: Date
  notebookPages?: INotebookPage[]
}

const UserSchema = new Schema<IUserDoc>({
  username: { type: String, required: true, unique: true },
  email: { type: String },
  passwordHash: { type: String },
  discordId: { type: String, unique: true, sparse: true },
  avatar: { type: String },
  role: { type: String, enum: ['ADMIN', 'NARRATEUR'], default: 'NARRATEUR' },
  createdAt: { type: Date, default: Date.now },
  notebookContent: { type: String, default: '' },
  notebookUpdatedAt: { type: Date },
  notebookPages: {
    type: [{ id: String, title: String, content: String }],
    default: undefined,
  },
})

export const User = (mongoose.models.User as mongoose.Model<IUserDoc>) || mongoose.model<IUserDoc>('User', UserSchema)
