import mongoose, { Schema, type Document } from 'mongoose'

export interface INotebookPage {
  id: string
  title: string
  content: string
}

export interface IMusicTrack {
  id: string
  title: string
  channel: string
  thumbnail: string
  duration: string
}

export interface IMusicPlaylist {
  id: string
  name: string
  tracks: IMusicTrack[]
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
  musicPlaylists?: IMusicPlaylist[]
}

const TrackSchema = new Schema({ id: String, title: String, channel: String, thumbnail: String, duration: String }, { _id: false })

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
  musicPlaylists: {
    type: [{ id: String, name: String, tracks: [TrackSchema] }],
    default: undefined,
  },
})

export const User = (mongoose.models.User as mongoose.Model<IUserDoc>) || mongoose.model<IUserDoc>('User', UserSchema)
