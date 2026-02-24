/**
 * Lightweight MongoDB persistence for bot settings & emoji pool.
 * Falls back to local JSON files if MONGO_URI is not set.
 *
 * Uses a single collection "bot_config" with two documents:
 *   { _id: 'settings', ... }
 *   { _id: 'emoji_pool', pool: [...] }
 */
import { MongoClient } from 'mongodb';

let db = null;
let collection = null;
let connected = false;

const COLLECTION = 'bot_config';

/**
 * Connect to MongoDB. Call once at startup.
 * Returns true if connected, false if MONGO_URI is missing or connection failed.
 */
export async function connectDB(uri) {
  if (!uri) return false;
  try {
    const client = new MongoClient(uri, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    });
    await client.connect();
    db = client.db(); // uses DB from URI
    collection = db.collection(COLLECTION);
    connected = true;
    console.log('[DB] ✅ Connected to MongoDB for settings persistence');
    return true;
  } catch (e) {
    console.warn('[DB] ⚠️ MongoDB connection failed, using local files:', e?.message);
    return false;
  }
}

export function isConnected() {
  return connected;
}

/**
 * Load settings from MongoDB.
 * Returns the settings object or null if not found.
 */
export async function loadSettings() {
  if (!connected) return null;
  try {
    const doc = await collection.findOne({ _id: 'settings' });
    if (!doc) return null;
    const { _id, ...settings } = doc;
    return settings;
  } catch (e) {
    console.warn('[DB] ⚠️ Failed to load settings:', e?.message);
    return null;
  }
}

/**
 * Save settings to MongoDB.
 */
export async function saveSettings(settings) {
  if (!connected) return false;
  try {
    await collection.updateOne(
      { _id: 'settings' },
      { $set: settings },
      { upsert: true }
    );
    return true;
  } catch (e) {
    console.warn('[DB] ⚠️ Failed to save settings:', e?.message);
    return false;
  }
}

/**
 * Load emoji pool from MongoDB.
 * Returns array or null if not found.
 */
export async function loadEmojiPool() {
  if (!connected) return null;
  try {
    const doc = await collection.findOne({ _id: 'emoji_pool' });
    return doc?.pool || null;
  } catch (e) {
    console.warn('[DB] ⚠️ Failed to load emoji pool:', e?.message);
    return null;
  }
}

/**
 * Save emoji pool to MongoDB.
 */
export async function saveEmojiPool(pool) {
  if (!connected) return false;
  try {
    await collection.updateOne(
      { _id: 'emoji_pool' },
      { $set: { pool } },
      { upsert: true }
    );
    return true;
  } catch (e) {
    console.warn('[DB] ⚠️ Failed to save emoji pool:', e?.message);
    return false;
  }
}
