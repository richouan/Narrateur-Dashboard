/**
 * One-time script: push local bot-settings.json & emoji-pool.json to MongoDB.
 * Run once: node discord-bot/seed-db.mjs
 */
import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not set in .env');
  process.exit(1);
}

const client = new MongoClient(MONGO_URI);

try {
  await client.connect();
  const col = client.db().collection('bot_config');

  // Push settings
  const settingsFile = join(__dirname, 'bot-settings.json');
  const settings = JSON.parse(readFileSync(settingsFile, 'utf8'));
  await col.updateOne({ _id: 'settings' }, { $set: settings }, { upsert: true });
  console.log('✅ Settings pushed to MongoDB:', settings);

  // Push emoji pool
  const emojiFile = join(__dirname, 'emoji-pool.json');
  const pool = JSON.parse(readFileSync(emojiFile, 'utf8'));
  await col.updateOne({ _id: 'emoji_pool' }, { $set: { pool } }, { upsert: true });
  console.log('✅ Emoji pool pushed to MongoDB:', pool.length, 'emojis');

  console.log('\n🎉 Done! Your settings are now saved in MongoDB forever.');
} catch (e) {
  console.error('❌ Error:', e.message);
} finally {
  await client.close();
}
