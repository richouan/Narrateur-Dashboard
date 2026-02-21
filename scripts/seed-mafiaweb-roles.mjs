/**
 * Seed script — imports all roles from mafiaweb.site/roles.html
 *
 * Usage:
 *   MONGO_URI=mongodb+srv://... node scripts/seed-mafiaweb-roles.mjs
 *
 * Options:
 *   --clear   Delete all existing roles before inserting
 *   --skip    Skip roles whose name already exists (default)
 */

import 'dotenv/config'
import mongoose from 'mongoose'

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/loupgarou'
const shouldClear = process.argv.includes('--clear')

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

// Team mapping: mafiaweb → our system
// VILLAGE → VILLAGER, LOUP → WOLF, NEUTRE → NEUTRAL
const roles = [
  // ── Night action roles ──────────────────────────────────────
  { name: 'Voleur',                   team: 'VILLAGER', nightOrder: 1,   hasNightAction: true  },
  { name: 'Doubleur',                 team: 'VILLAGER', nightOrder: 2,   hasNightAction: true  },
  { name: 'Joker',                    team: 'VILLAGER', nightOrder: 3,   hasNightAction: true  },
  { name: 'Livreur',                  team: 'WOLF',     nightOrder: 10,  hasNightAction: true  },
  { name: 'Loup Alpha',               team: 'WOLF',     nightOrder: 19,  hasNightAction: true  },
  { name: 'Loup Vert',                team: 'VILLAGER', nightOrder: 20,  hasNightAction: true  },
  { name: 'Salvateur',                team: 'WOLF',     nightOrder: 21,  hasNightAction: true  },
  { name: 'Loup Père',                team: 'WOLF',     nightOrder: 22,  hasNightAction: true  },
  { name: 'Loup Rouge',               team: 'WOLF',     nightOrder: 23,  hasNightAction: true  },
  { name: 'Loup Noir',                team: 'WOLF',     nightOrder: 24,  hasNightAction: true  },
  { name: 'Loup Bavard',              team: 'WOLF',     nightOrder: 25,  hasNightAction: true  },
  { name: 'Loup Rose',                team: 'WOLF',     nightOrder: 26,  hasNightAction: true  },
  { name: 'Loup Aveugle',             team: 'WOLF',     nightOrder: 27,  hasNightAction: true  },
  { name: 'Le Grand Méchant Loup',    team: 'WOLF',     nightOrder: 28,  hasNightAction: true  },
  { name: 'Loup Spy',                 team: 'WOLF',     nightOrder: 29,  hasNightAction: true  },
  { name: 'Loup Bébé',                team: 'WOLF',     nightOrder: 30,  hasNightAction: true  },
  { name: 'Loup Jinkin',              team: 'WOLF',     nightOrder: 31,  hasNightAction: true  },
  { name: 'Loup Simple',              team: 'NEUTRAL',  nightOrder: 40,  hasNightAction: true,  isUnique: false },
  { name: 'Simple Villageois',         team: 'VILLAGER', nightOrder: 999, hasNightAction: false, isUnique: false },
  { name: "L'Enfant Sauvage",         team: 'NEUTRAL',  nightOrder: 41,  hasNightAction: true  },
  { name: 'Chien-Loup',               team: 'VILLAGER', nightOrder: 42,  hasNightAction: true  },
  { name: 'Sorcière',                 team: 'VILLAGER', nightOrder: 60,  hasNightAction: true  },
  { name: '3 Face',                   team: 'VILLAGER', nightOrder: 61,  hasNightAction: true  },
  { name: 'La Moin',                  team: 'VILLAGER', nightOrder: 61,  hasNightAction: true  },
  { name: 'Cupidon',                  team: 'VILLAGER', nightOrder: 62,  hasNightAction: true  },
  { name: 'Les 2 Sœurs',              team: 'VILLAGER', nightOrder: 63,  hasNightAction: true  },
  { name: 'Les 3 Frères',             team: 'VILLAGER', nightOrder: 64,  hasNightAction: true  },
  { name: 'Corbeau',                  team: 'VILLAGER', nightOrder: 65,  hasNightAction: true  },
  { name: 'Hibou',                    team: 'VILLAGER', nightOrder: 66,  hasNightAction: true  },
  { name: 'Eagle',                    team: 'VILLAGER', nightOrder: 67,  hasNightAction: true  },
  { name: 'Alchimiste',               team: 'VILLAGER', nightOrder: 80,  hasNightAction: true  },
  { name: 'Dragon',                   team: 'VILLAGER', nightOrder: 81,  hasNightAction: true  },
  { name: 'Prêtre',                   team: 'VILLAGER', nightOrder: 82,  hasNightAction: true  },
  { name: 'Lgharib',                  team: 'VILLAGER', nightOrder: 83,  hasNightAction: true  },
  { name: 'Renard',                   team: 'VILLAGER', nightOrder: 90,  hasNightAction: true  },
  { name: 'Lapin',                    team: 'VILLAGER', nightOrder: 91,  hasNightAction: true  },
  { name: 'Petite Fille',             team: 'VILLAGER', nightOrder: 92,  hasNightAction: true  },
  { name: 'Chasseur',                 team: 'VILLAGER', nightOrder: 93,  hasNightAction: true  },
  { name: 'Jin',                      team: 'VILLAGER', nightOrder: 94,  hasNightAction: true  },
  { name: 'Détective',                team: 'VILLAGER', nightOrder: 95,  hasNightAction: true  },
  { name: 'Voyante',                  team: 'VILLAGER', nightOrder: 96,  hasNightAction: true  },
  { name: 'Robot',                    team: 'VILLAGER', nightOrder: 97,  hasNightAction: true  },
  { name: 'Miroir',                   team: 'NEUTRAL',  nightOrder: 98,  hasNightAction: true  },
  { name: 'Alien',                    team: 'NEUTRAL',  nightOrder: 120, hasNightAction: true  },
  { name: 'Pyromane',                 team: 'NEUTRAL',  nightOrder: 121, hasNightAction: true  },
  { name: 'Loup Blanc',               team: 'NEUTRAL',  nightOrder: 122, hasNightAction: true  },
  { name: 'Avocat',                   team: 'NEUTRAL',  nightOrder: 123, hasNightAction: true  },
  { name: 'Ange',                     team: 'NEUTRAL',  nightOrder: 124, hasNightAction: true  },
  { name: 'Vampire',                  team: 'NEUTRAL',  nightOrder: 125, hasNightAction: true  },
  { name: 'Bandit',                   team: 'NEUTRAL',  nightOrder: 126, hasNightAction: true  },
  { name: 'Lmjhol X',                 team: 'VILLAGER', nightOrder: 127, hasNightAction: true  },
  { name: 'Warit',                    team: 'VILLAGER', nightOrder: 149, hasNightAction: true  },
  // ── Passive / Day roles ─────────────────────────────────────
  { name: 'Sv',                       team: 'VILLAGER', nightOrder: 999, hasNightAction: false },
  { name: 'Dictateur',                team: 'VILLAGER', nightOrder: 999, hasNightAction: false },
  { name: 'Juge',                     team: 'VILLAGER', nightOrder: 999, hasNightAction: false },
  { name: 'Barbier',                  team: 'VILLAGER', nightOrder: 999, hasNightAction: false },
  { name: 'Ancien',                   team: 'VILLAGER', nightOrder: 999, hasNightAction: false },
  { name: 'Hydra',                    team: 'VILLAGER', nightOrder: 999, hasNightAction: false },
  { name: 'Bouc-Émissaire',           team: 'VILLAGER', nightOrder: 999, hasNightAction: false },
  { name: 'Chevalier',                team: 'VILLAGER', nightOrder: 999, hasNightAction: false },
  { name: 'Fantôme',                  team: 'VILLAGER', nightOrder: 999, hasNightAction: false },
  { name: 'Le Petit Chaperon Rouge',  team: 'VILLAGER', nightOrder: 999, hasNightAction: false },
]

// Default icon by team
const teamIcons = { WOLF: '🐺', VILLAGER: '🏘️', NEUTRAL: '⚖️' }

async function main() {
  await mongoose.connect(MONGO_URI)
  console.log('✅ Connected to MongoDB')

  const Role = mongoose.model('Role', RoleSchema)

  if (shouldClear) {
    await Role.deleteMany({})
    console.log('🗑️  Cleared all existing roles')
  }

  let inserted = 0
  let skipped = 0

  for (const role of roles) {
    const exists = await Role.findOne({ name: role.name })
    if (exists) {
      console.log(`  ⏭️  Skipped (exists): ${role.name}`)
      skipped++
      continue
    }

    await Role.create({
      ...role,
      description: '',
      isUnique: role.isUnique ?? true,
      icon: teamIcons[role.team] || '❓',
    })
    console.log(`  ✨ Inserted: ${role.name} [${role.team}] order=${role.nightOrder}`)
    inserted++
  }

  console.log(`\n🎉 Done — ${inserted} inserted, ${skipped} skipped`)
  await mongoose.disconnect()
}

main().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})
