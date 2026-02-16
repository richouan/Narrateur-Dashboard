/**
 * Seed script to populate default Loup Garou roles in the grimoire.
 *
 * Usage:
 *   MONGO_URI=mongodb+srv://... node scripts/seed-roles.mjs
 */

import 'dotenv/config'
import mongoose from 'mongoose'

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/loupgarou'

const RoleSchema = new mongoose.Schema({
  name: String,
  team: String,
  description: String,
  nightOrder: Number,
  hasNightAction: Boolean,
  isUnique: Boolean,
  icon: String,
  createdAt: { type: Date, default: Date.now },
})

const defaultRoles = [
  {
    name: 'Loup-Garou',
    team: 'WOLF',
    description: 'Each night, the werewolves choose a victim to devour.',
    nightOrder: 10,
    hasNightAction: true,
    isUnique: false,
    icon: '🐺',
  },
  {
    name: 'Voyante',
    team: 'VILLAGER',
    description: 'Each night, the seer can look at one player\'s card.',
    nightOrder: 1,
    hasNightAction: true,
    isUnique: true,
    icon: '🔮',
  },
  {
    name: 'Sorcière',
    team: 'VILLAGER',
    description: 'Has two potions: one to save, one to kill. Each used once per game.',
    nightOrder: 20,
    hasNightAction: true,
    isUnique: true,
    icon: '🧪',
  },
  {
    name: 'Chasseur',
    team: 'VILLAGER',
    description: 'When the hunter dies, they can immediately shoot another player.',
    nightOrder: 99,
    hasNightAction: false,
    isUnique: true,
    icon: '🏹',
  },
  {
    name: 'Cupidon',
    team: 'VILLAGER',
    description: 'On the first night, Cupid chooses two lovers. If one dies, the other dies too.',
    nightOrder: 0,
    hasNightAction: true,
    isUnique: true,
    icon: '💘',
  },
  {
    name: 'Petite Fille',
    team: 'VILLAGER',
    description: 'Can spy on the werewolves at night. If caught, she dies.',
    nightOrder: 10,
    hasNightAction: false,
    isUnique: true,
    icon: '👧',
  },
  {
    name: 'Salvateur',
    team: 'VILLAGER',
    description: 'Each night, protects one player from being killed by wolves.',
    nightOrder: 5,
    hasNightAction: true,
    isUnique: true,
    icon: '🛡️',
  },
  {
    name: 'Ancien',
    team: 'VILLAGER',
    description: 'Survives the first wolf attack. If killed by the village, all villagers lose their powers.',
    nightOrder: 99,
    hasNightAction: false,
    isUnique: true,
    icon: '👴',
  },
  {
    name: 'Loup-Garou Blanc',
    team: 'NEUTRAL',
    description: 'A lone wolf who wins if they are the last one standing. Kills a wolf every other night.',
    nightOrder: 25,
    hasNightAction: true,
    isUnique: true,
    icon: '🐺',
  },
  {
    name: 'Villageois',
    team: 'VILLAGER',
    description: 'A simple villager with no special power. Must use their vote wisely.',
    nightOrder: 99,
    hasNightAction: false,
    isUnique: false,
    icon: '🧑‍🌾',
  },
  {
    name: 'Infect Père des Loups',
    team: 'WOLF',
    description: 'Once per game, instead of killing, can infect a villager to turn them into a wolf.',
    nightOrder: 15,
    hasNightAction: true,
    isUnique: true,
    icon: '🦠',
  },
]

async function seed() {
  console.log('[Seed] Connecting to MongoDB...')
  await mongoose.connect(MONGO_URI)

  const Role = mongoose.model('Role', RoleSchema)

  for (const role of defaultRoles) {
    const exists = await Role.findOne({ name: role.name })
    if (exists) {
      console.log(`  [Skip] ${role.name} already exists`)
      continue
    }
    await Role.create(role)
    console.log(`  [Created] ${role.icon} ${role.name} (${role.team})`)
  }

  await mongoose.disconnect()
  console.log('[Seed] Done. Roles seeded.')
}

seed().catch((err) => {
  console.error('[Seed] Error:', err)
  process.exit(1)
})
