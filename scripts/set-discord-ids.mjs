/**
 * One-time script: set Discord IDs for existing users in MongoDB.
 *
 * Usage:
 *   MONGO_URI=mongodb+srv://... node scripts/set-discord-ids.mjs
 *
 * Edit the DISCORD_IDS map below before running.
 */

import 'dotenv/config'
import mongoose from 'mongoose'

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/loupgarou'

// Map of username → Discord user ID
const DISCORD_IDS = {
  'rachid': '548893712806182932',
  'iman':   '1165276984432148551',
  // Add more as needed: 'username': 'discordId'
}

const UserSchema = new mongoose.Schema({
  username: String,
  discordId: String,
  role: String,
})

async function run() {
  console.log('[Setup] Connecting to MongoDB...')
  await mongoose.connect(MONGO_URI)
  const User = mongoose.model('User', UserSchema)

  for (const [username, discordId] of Object.entries(DISCORD_IDS)) {
    // Case-insensitive match
    const user = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } })
    if (!user) {
      console.log(`[Setup] User not found: ${username}`)
      continue
    }
    if (user.discordId === discordId) {
      console.log(`[Setup] ${username} already has discordId ${discordId} — skipped`)
      continue
    }
    await User.updateOne({ _id: user._id }, { $set: { discordId } })
    console.log(`[Setup] Set ${username} → discordId: ${discordId}`)
  }

  await mongoose.disconnect()
  console.log('[Setup] Done.')
}

run().catch((err) => {
  console.error('[Setup] Error:', err)
  process.exit(1)
})
