import mongoose, { Document, Model, Schema } from 'mongoose'

export interface IBotState extends Document {
    id: string
    scanRequest: boolean
    fetchRequests: string[]
    lastHeartbeat: number
    pendingSettingsUpdate: Record<string, any> | null

    gameState: {
        channelId?: string
        channelName?: string
        guildId?: string
        guildName?: string
        guildIcon?: string
        gameId?: string
    }

    pendingScanResults: any[]

    botProfile: Record<string, any> | null
    targetProfile: Record<string, any> | null
}

const BotStateSchema = new Schema<IBotState>({
    id: { type: String, default: 'singleton', unique: true },
    scanRequest: { type: Boolean, default: false },
    fetchRequests: { type: [String], default: [] },
    lastHeartbeat: { type: Number, default: 0 },
    pendingSettingsUpdate: { type: Schema.Types.Mixed, default: null },

    gameState: {
        channelId: String,
        channelName: String,
        guildId: String,
        guildName: String,
        guildIcon: String,
        gameId: String
    },

    pendingScanResults: { type: Schema.Types.Mixed, default: [] },

    botProfile: { type: Schema.Types.Mixed, default: null },
    targetProfile: { type: Schema.Types.Mixed, default: null },
}, { timestamps: true })

export const BotStateModel = (mongoose.models.BotState as Model<IBotState>) || mongoose.model<IBotState>('BotState', BotStateSchema)
