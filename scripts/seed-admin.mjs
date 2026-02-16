/**
 * Seed script to create the default admin user.
 *
 * Usage:
 *   MONGO_URI=mongodb+srv://... node scripts/seed-admin.mjs
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/loupgarou'

const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  passwordHash: String,
  discordId: String,
  avatar: String,
  role: { type: String, enum: ['ADMIN', 'NARRATEUR'] },
  createdAt: { type: Date, default: Date.now },
})

async function seed() {
  console.log('[Seed] Connecting to MongoDB...')
  await mongoose.connect(MONGO_URI)

  const User = mongoose.model('User', UserSchema)

  const existing = await User.findOne({ email: 'admin@loupgarou.local' })
  if (existing) {
    console.log('[Seed] Admin user already exists:', existing.username)
    await mongoose.disconnect()
    return
  }

  const hash = await bcrypt.hash('admin123', 12)

  const admin = await User.create({
    username: 'Narrateur',
    email: 'admin@loupgarou.local',
    passwordHash: hash,
    role: 'ADMIN',
  })

  console.log('[Seed] Admin user created:')
  console.log(`  Email:    admin@loupgarou.local`)
  console.log(`  Password: admin123`)
  console.log(`  Role:     ADMIN`)
  console.log(`  ID:       ${admin._id}`)

  await mongoose.disconnect()
  console.log('[Seed] Done.')
}

seed().catch((err) => {
  console.error('[Seed] Error:', err)
  process.exit(1)
})
