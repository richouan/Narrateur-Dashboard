/**
 * Lightweight MongoDB persistence for bot settings & emoji pool.
 * Falls back to local JSON files if MONGO_URI is not set.
 *
 * Uses a single collection "bot_config" with two documents:
 *   { _id: 'settings', ... }
 *   { _id: 'emoji_pool', pool: [...] }
 */
import { MongoClient } from 'mongodb';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

// ─── Minimal ANSI log helpers (matches selfbot.js style) ────
const _c = { reset: '\x1b[0m', bold: '\x1b[1m', yellow: '\x1b[33m', green: '\x1b[32m', red: '\x1b[31m', gray: '\x1b[90m' };
const _ts = () => `${_c.gray}${new Date().toLocaleTimeString('en-GB')}${_c.reset}`;
const _pad = (l) => l.padEnd(8);
const dbLog = {
  ok:   (...a) => console.log(`${_ts()} ${_c.green}${_c.bold}${_pad('OK')}${_c.reset}`, ...a),
  db:   (...a) => console.log(`${_ts()} ${_c.yellow}${_pad('DB')}${_c.reset}`, ...a),
  warn: (...a) => console.warn(`${_ts()} ${_c.yellow}${_c.bold}${_pad('WARN')}${_c.reset}`, ...a),
};

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
    dbLog.ok(`Connected to ${_c.yellow}MongoDB${_c.reset} for persistence`);
    return true;
  } catch (e) {
    dbLog.warn('MongoDB connection failed, using local files:', e?.message);
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
    dbLog.warn('Failed to load settings:', e?.message);
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
    dbLog.warn('Failed to save settings:', e?.message);
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
    dbLog.warn('Failed to load emoji pool:', e?.message);
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
    dbLog.warn('Failed to save emoji pool:', e?.message);
    return false;
  }
}
