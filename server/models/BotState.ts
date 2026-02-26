import mongoose from 'mongoose'

const BotStateSchema = new mongoose.Schema({
    id: { type: String, default: 'singleton', unique: true },
    scanRequest: { type: Boolean, default: false },
    fetchRequests: { type: [String], default: [] },
    lastHeartbeat: { type: Number, default: 0 },
    pendingSettingsUpdate: { type: mongoose.Schema.Types.Mixed, default: null },

    gameState: {
        channelId: String,
        channelName: String,
        guildId: String,
        guildName: String,
        guildIcon: String,
        gameId: String
    },

    pendingScanResults: { type: [mongoose.Schema.Types.Mixed], default: [] },

    botProfile: { type: mongoose.Schema.Types.Mixed, default: null },
    targetProfile: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true })

export const BotStateModel = mongoose.models.BotState || mongoose.model('BotState', BotStateSchema)
