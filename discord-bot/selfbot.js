/**
 * Discord Self-Bot for Loup-Garou Online
 * 
 * This self-bot polls the game server for scan/fetch requests,
 * adds Discord users to games, and optionally stalks a target user.
 * 
 * Can run standalone (node selfbot.js) or embedded in the Nuxt server.
 */

import { Client } from 'discord.js-selfbot-v13';
import Voice from 'discord.js-selfbot-v13/src/util/Voice.js';
const { joinVoiceChannel, getVoiceConnection } = Voice;
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { createWriteStream, mkdirSync, statSync, renameSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { connectDB, isConnected, loadSettings as dbLoadSettings, saveSettings as dbSaveSettings, loadEmojiPool as dbLoadEmojiPool, saveEmojiPool as dbSaveEmojiPool } from './db.js';

// Load .env from root (only needed for standalone mode)
dotenv.config();

// ─── Environment variable helper (supports 0 as a valid value) ──
const envNum = (key, fallback) => {
  const v = process.env[key];
  if (v === undefined || v === '') return fallback;
  const n = Number(v);
  return isNaN(n) ? fallback : n;
};

let client = null;
let isReady = false;
let activeIntervals = [];  // Track intervals for cleanup on rotation

// Reusable headers — avoids creating a new object on every HTTP call
const JSON_HEADERS = Object.freeze({ 'Content-Type': 'application/json' });

// ─── Crash-proof Activity Logger ────────────────────────────
// Ring buffer in memory (instant reads) + batched JSONL file on disk

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = join(__dirname, 'logs');
const LOG_FILE = join(LOG_DIR, 'activity.jsonl');
const MAX_LOG_FILE_MB = envNum('BOT_LOG_MAX_FILE_MB', 5);
const RING_BUFFER_SIZE = envNum('BOT_LOG_RING_BUFFER', 500);
const FLUSH_INTERVAL_MS = envNum('BOT_LOG_FLUSH_INTERVAL', 5000);

// In-memory ring buffer — fixed size, O(1) insert
const logBuffer = [];
let logBufferIndex = 0;

// Pending writes — batched to reduce I/O
let pendingWrites = [];
let logStream = null;

function initLogger() {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    logStream = createWriteStream(LOG_FILE, { flags: 'a' });
    logStream.on('error', () => { /* never crash from log I/O */ });
    // Flush pending writes to disk periodically
    setInterval(flushLogs, FLUSH_INTERVAL_MS);
  } catch (e) {
    console.warn('[Logger] ⚠️ Could not init log file (logging to memory only)');
  }
}

function flushLogs() {
  try {
    if (!logStream || pendingWrites.length === 0) return;
    // Rotate if file too big
    try {
      const stats = statSync(LOG_FILE);
      if (stats.size > MAX_LOG_FILE_MB * 1024 * 1024) {
        logStream.end();
        renameSync(LOG_FILE, LOG_FILE.replace('.jsonl', `-${Date.now()}.jsonl`));
        logStream = createWriteStream(LOG_FILE, { flags: 'a' });
        logStream.on('error', () => {});
      }
    } catch (e) { /* file might not exist yet */ }
    const batch = pendingWrites.join('');
    pendingWrites = [];
    logStream.write(batch);
  } catch (e) { /* never crash */ }
}

/**
 * Log a bot activity event.
 * @param {'reaction'|'vc_join'|'vc_leave'|'vc_error'|'ready'|'skip'|'error'|'login'|'disconnect'|'reconnect'} type
 * @param {Record<string, any>} data
 */
function botLog(type, data = {}) {
  try {
    const entry = {
      ts: new Date().toISOString(),
      type,
      ...data,
    };
    // Ring buffer insert (overwrites oldest when full)
    if (logBuffer.length < RING_BUFFER_SIZE) {
      logBuffer.push(entry);
    } else {
      logBuffer[logBufferIndex % RING_BUFFER_SIZE] = entry;
    }
    logBufferIndex++;
    // Queue for disk write
    pendingWrites.push(JSON.stringify(entry) + '\n');
  } catch (e) { /* never crash */ }
}

/** Get last N log entries (newest first) for the API / dashboard */
export function getBotLogs(limit = 200) {
  try {
    const sorted = logBuffer.slice().sort((a, b) => b.ts.localeCompare(a.ts));
    return sorted.slice(0, Math.min(limit, RING_BUFFER_SIZE));
  } catch (e) {
    return [];
  }
}

// Start the logger immediately
initLogger();

// ─── Global crash protection ────────────────────────────────
// These catch ANYTHING that would crash the process

process.on('uncaughtException', (err) => {
  console.error('[Bot] 🛡️ Uncaught exception (prevented crash):', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Bot] 🛡️ Unhandled promise rejection (prevented crash):', reason?.message || reason);
  if (reason?.stack) console.error(reason.stack);
});

// ─── Exported start function ────────────────────────────────

export function startBot(options = {}) {
  const DISCORD_TOKEN = options.token || process.env.DISCORD_TOKEN;
  const SERVER_URL = options.serverUrl || process.env.SERVER_URL || 'http://localhost:3000';
  const POLL_INTERVAL = options.pollInterval || envNum('BOT_POLL_INTERVAL', 3000);
  const HEARTBEAT_INTERVAL = options.heartbeatInterval || envNum('BOT_HEARTBEAT_INTERVAL', 5000);
  const STALK_USER_ID = options.stalkUserId || process.env.STALK_USER_ID || '';
  const STALK_EMOJI = options.stalkEmoji || process.env.STALK_EMOJI || '👀';
  const STALK_ENABLED = !!STALK_USER_ID;

  // ─── Configurable timing (all overridable via .env) ──────
  const MAX_RETRIES = envNum('BOT_MAX_RETRIES', 2);
  const SKIP_CHANCE = envNum('BOT_SKIP_CHANCE', 0.2);
  const REACTION_DELAY_MIN = envNum('BOT_REACTION_DELAY_MIN', 1500);
  const REACTION_DELAY_MAX = envNum('BOT_REACTION_DELAY_MAX', 5000);
  const BURST_DEBOUNCE_MIN = envNum('BOT_BURST_DEBOUNCE_MIN', 1000);
  const BURST_DEBOUNCE_MAX = envNum('BOT_BURST_DEBOUNCE_MAX', 2000);
  const SPAM_WINDOW_MS = envNum('BOT_SPAM_WINDOW', 15000);       // Sliding window for spam detection
  const SPAM_THRESHOLD = envNum('BOT_SPAM_THRESHOLD', 12);       // Msgs in window to trigger spam mode
  const SPAM_COOLDOWN_MS = envNum('BOT_SPAM_COOLDOWN', 5000);    // Silence needed to exit spam mode
  const TYPING_DELAY_MIN = envNum('BOT_TYPING_DELAY_MIN', 400);  // Min typing delay before cmd reply
  const TYPING_DELAY_MAX = envNum('BOT_TYPING_DELAY_MAX', 1200); // Max typing delay before cmd reply
  // Defend module timing
  const DEFEND_DELAY_MIN = envNum('BOT_DEFEND_DELAY_MIN', 2000);   // Min delay before defending
  const DEFEND_DELAY_MAX = envNum('BOT_DEFEND_DELAY_MAX', 5000);   // Max delay before defending
  const DEFEND_COOLDOWN_MS = envNum('BOT_DEFEND_COOLDOWN', 30000); // Per-user cooldown (don't spam same person)
  const DEFEND_SPAM_WINDOW = envNum('BOT_DEFEND_SPAM_WINDOW', 60000); // Global defend sliding window
  const DEFEND_SPAM_MAX = envNum('BOT_DEFEND_SPAM_MAX', 3);          // Max defends per window
  const VC_JOIN_DELAY_MIN = envNum('BOT_VC_JOIN_DELAY_MIN', 3000);
  const VC_JOIN_DELAY_MAX = envNum('BOT_VC_JOIN_DELAY_MAX', 15000);
  const VC_LEAVE_DELAY_MIN = envNum('BOT_VC_LEAVE_DELAY_MIN', 60000);
  const VC_LEAVE_DELAY_MAX = envNum('BOT_VC_LEAVE_DELAY_MAX', 120000);
  const VC_RECONNECT_DELAY = envNum('BOT_VC_RECONNECT_DELAY', 5000);   // Delay before rejoining after kick/disconnect
  const REACT_QUEUE_MAX = envNum('BOT_REACT_QUEUE_MAX', 50);           // Max queued reactions (drop oldest)
  const MAX_LOGIN_ATTEMPTS = envNum('BOT_MAX_LOGIN_ATTEMPTS', 5);
  const LOGIN_RETRY_BASE = envNum('BOT_LOGIN_RETRY_BASE', 5000);
  const LOGIN_RETRY_MAX = envNum('BOT_LOGIN_RETRY_MAX', 30000);

  if (!DISCORD_TOKEN) {
    console.log('[Bot] No DISCORD_TOKEN set — Discord bot disabled');
    return null;
  }

  // Clean up old intervals from previous rotation cycle
  for (const id of activeIntervals) clearInterval(id);
  activeIntervals = [];

  client = new Client({
    checkUpdate: false,
    syncStatus: false,        // Don't sync presence — saves bandwidth
    DMSync: false,            // Don't sync DMs — we don't use them
    patchVoice: false,        // No voice patching needed
    // NOTE: ALL message cache options (messageCacheMaxSize, messageCacheLifetime,
    // messageSweepInterval) crash discord.js-selfbot-v13 with "Cannot read
    // properties of null (reading 'all')". Using defaults only.
  });

  // ─── Client-level crash protection ───────────────────────

  // Catch all client errors (network drops, API errors, rate limits, etc.)
  client.on('error', (error) => {
    console.error('[Bot] ❌ Discord error:', error?.message || error);
  });

  // WebSocket errors (connection drops, reconnect failures)
  client.on('shardError', (error) => {
    console.error('[Bot] ❌ WebSocket error:', error?.message || error);
  });

  // Warn on rate limits, missing permissions, etc.
  client.on('warn', (info) => {
    console.warn('[Bot] ⚠️ Warning:', info);
  });

  // Handle disconnects — bot will auto-reconnect
  client.on('shardDisconnect', (event, id) => {
    botLog('disconnect', { shard: id });
    console.warn(`[Bot] ⚠️ Disconnected (shard ${id}). Auto-reconnecting...`);
    isReady = false;
  });

  // Back online after reconnect
  client.on('shardReconnecting', (id) => {
    botLog('reconnect', { shard: id, phase: 'reconnecting' });
    console.log(`[Bot] 🔄 Reconnecting (shard ${id})...`);
    isReady = false;
  });

  client.on('shardResume', (id) => {
    botLog('reconnect', { shard: id, phase: 'resumed' });
    console.log(`[Bot] ✅ Resumed (shard ${id})`);
    isReady = true;
  });

  // Invalidated session — token revoked or account disabled
  client.on('invalidated', () => {
    console.error('[Bot] ❌ Session invalidated (token may be revoked). Bot stopped.');
    isReady = false;
  });

  // Track failed attempts to avoid infinite retries
  const failedScans = new Map();
  const failedFetches = new Map();

  function trackFailure(map, id) {
    const existing = map.get(id);
    if (existing) {
      existing.count++;
      existing.lastTime = Date.now();
    } else {
      map.set(id, { count: 1, lastTime: Date.now() });
    }
    const entry = map.get(id);
    if (entry.count >= MAX_RETRIES) {
      console.log(`🛑 Stopped retrying ${id} (failed ${entry.count} times)`);
    }
  }

  // ─── Discord Client Events ──────────────────────────────

  client.on('ready', async () => {
    console.log(`[Bot] ✅ Logged in as ${client.user.tag}`);
    console.log(`[Bot] 🔗 Server: ${SERVER_URL}`);

    // ─── Connect to MongoDB & load persisted data ───────────
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || '';
    const dbOk = await connectDB(mongoUri);
    if (dbOk) {
      // Load settings from DB (overrides local file)
      const dbSettings = await dbLoadSettings();
      if (dbSettings) {
        if (typeof dbSettings.selfReactEnabled === 'boolean') selfReactEnabled = dbSettings.selfReactEnabled;
        if ([0, 1, 2].includes(dbSettings.defendMode)) defendMode = dbSettings.defendMode;
        if (typeof dbSettings.vcFollow === 'boolean') vcFollow = dbSettings.vcFollow;
        if (typeof dbSettings.vcSadReact === 'boolean') vcSadReact = dbSettings.vcSadReact;
        if (typeof dbSettings.crossGuildLeave === 'boolean') crossGuildLeave = dbSettings.crossGuildLeave;
        if (typeof dbSettings.followStage === 'boolean') followStage = dbSettings.followStage;
        if (typeof dbSettings.snipeEnabled === 'boolean') snipeEnabled = dbSettings.snipeEnabled;
        if (Array.isArray(dbSettings.snipeGuilds)) snipeGuilds = dbSettings.snipeGuilds;
        console.log(`[Bot] ⚙️ Loaded settings from MongoDB: selfReact=${selfReactEnabled}, defendMode=${defendMode}, vcFollow=${vcFollow}, vcSadReact=${vcSadReact}, crossGuild=${crossGuildLeave}, stage=${followStage}, snipe=${snipeEnabled}`);
      }
      // Load emoji pool from DB (overrides local file)
      const dbEmojis = await dbLoadEmojiPool();
      if (dbEmojis && Array.isArray(dbEmojis) && dbEmojis.length > 0) {
        emojiPool.length = 0;
        emojiPool.push(...dbEmojis);
        console.log(`[Bot] 🎯 Loaded emoji pool from MongoDB: ${emojiPool.length} emojis`);
      }
    }

    if (STALK_ENABLED) {
      console.log(`[Bot] 👁️ Stalker mode ON — following ${STALK_USER_ID} with ${STALK_EMOJI}`);
    }
    isReady = true;
    botLog('ready', { user: client.user?.tag, server: SERVER_URL, stalk: STALK_ENABLED });

    // Heartbeat
    activeIntervals.push(setInterval(() => { if (isReady) sendHeartbeat(); }, HEARTBEAT_INTERVAL));
    // Polling
    activeIntervals.push(setInterval(() => { if (isReady) pollState(); }, POLL_INTERVAL));

    // ─── Check if target is already in a VC on startup ─────
    if (STALK_ENABLED && vcFollow) {
      try {
        for (const [, guild] of client.guilds.cache) {
          const member = guild.members.cache.get(STALK_USER_ID);
          if (member?.voice?.channel) {
            const ch = member.voice.channel;
            console.log(`[Bot] 👁️ Target already in VC "${ch.name}" — joining after delay...`);
            setTimeout(async () => {
              await safeJoinVC(ch, guild, 'startup');
            }, VC_JOIN_DELAY_MIN + Math.random() * (VC_JOIN_DELAY_MAX - VC_JOIN_DELAY_MIN));
            break; // Only join one VC
          }
        }
      } catch (e) {
        console.warn('[Bot] ⚠️ Startup VC check failed:', e?.message);
      }
    }
  });

  // ─── Stalker Mode (with anti-detection) ───────────────────

  // Random delay helper — makes actions look human
  const randomDelay = (min, max) => new Promise(r => setTimeout(r, min + Math.random() * (max - min)));

  // ─── Anti-detection layer ────────────────────────────────
  // Multiple emoji reactions look way more human than one repeated emoji
  const EMOJI_POOL_FILE = join(dirname(fileURLToPath(import.meta.url)), 'emoji-pool.json');

  // Load emoji pool: file > env > default
  let emojiPool;
  try {
    if (existsSync(EMOJI_POOL_FILE)) {
      emojiPool = JSON.parse(readFileSync(EMOJI_POOL_FILE, 'utf8'));
      if (!Array.isArray(emojiPool) || emojiPool.length === 0) throw new Error('invalid');
    } else {
      emojiPool = (process.env.STALK_EMOJI_POOL || STALK_EMOJI).split(',').map(e => e.trim());
    }
  } catch {
    emojiPool = (process.env.STALK_EMOJI_POOL || STALK_EMOJI).split(',').map(e => e.trim());
  }

  function saveEmojiPool() {
    try { writeFileSync(EMOJI_POOL_FILE, JSON.stringify(emojiPool), 'utf8'); } catch { /* ok */ }
    if (isConnected()) dbSaveEmojiPool(emojiPool).catch(() => {});
  }
  const reactQueue = [];           // Queue of messages waiting to be reacted to
  let isProcessingQueue = false;   // Whether the queue processor is running
  const targetMsgTimes = [];       // Sliding window of target message timestamps
  let spamMode = false;            // True = target is spamming, stop reacting
  let spamCooldownTimer = null;    // Timer to exit spam mode after silence

  // ─── Persistent settings (saved to bot-settings.json) ─────
  const SETTINGS_FILE = join(dirname(fileURLToPath(import.meta.url)), 'bot-settings.json');
  let selfReactEnabled = true;
  let defendMode = 0;              // 0=off, 1=mention only, 2=mention+reply
  let vcFollow = true;             // Follow target into voice channels at all
  let vcSadReact = true;           // Send 🥺 when kicked from VC
  let crossGuildLeave = true;      // Leave old guild VC when target moves cross-guild
  let followStage = false;         // Follow target into stage channels
  let snipeEnabled = false;        // Capture deleted messages for snipe command
  let snipeGuilds = [];             // Guild IDs to snipe in (empty = all guilds)

  // Load saved settings
  try {
    if (existsSync(SETTINGS_FILE)) {
      const saved = JSON.parse(readFileSync(SETTINGS_FILE, 'utf8'));
      if (typeof saved.selfReactEnabled === 'boolean') selfReactEnabled = saved.selfReactEnabled;
      if ([0, 1, 2].includes(saved.defendMode)) defendMode = saved.defendMode;
      if (typeof saved.vcFollow === 'boolean') vcFollow = saved.vcFollow;
      if (typeof saved.vcSadReact === 'boolean') vcSadReact = saved.vcSadReact;
      if (typeof saved.crossGuildLeave === 'boolean') crossGuildLeave = saved.crossGuildLeave;
      if (typeof saved.followStage === 'boolean') followStage = saved.followStage;
      if (typeof saved.snipeEnabled === 'boolean') snipeEnabled = saved.snipeEnabled;
      if (Array.isArray(saved.snipeGuilds)) snipeGuilds = saved.snipeGuilds;
      console.log(`[Bot] ⚙️ Loaded settings: selfReact=${selfReactEnabled}, defendMode=${defendMode}, vcFollow=${vcFollow}, vcSadReact=${vcSadReact}, crossGuild=${crossGuildLeave}, stage=${followStage}, snipe=${snipeEnabled}`);
    }
  } catch { /* use defaults */ }

  function saveSettings() {
    const data = { selfReactEnabled, defendMode, vcFollow, vcSadReact, crossGuildLeave, followStage, snipeEnabled, snipeGuilds };
    try { writeFileSync(SETTINGS_FILE, JSON.stringify(data), 'utf8'); } catch { /* ok */ }
    if (isConnected()) dbSaveSettings(data).catch(() => {});
  }
  const defendCooldowns = new Map(); // userId -> last defend timestamp
  const defendTimes = [];            // Sliding window of defend action timestamps

  // ─── Voice state (declared here so all code can access) ─────
  let vcJoinTimer = null;           // Debounce rapid channel switches
  let vcLeaveTimer = null;          // Delayed leave after target disconnects
  let vcErrorLogged = new Set();    // Track already-logged vc errors (dedup)
  let currentVcChannelId = null;    // Track which VC we're currently in
  let currentVcGuildId = null;      // Track which guild the bot is connected to

  // ─── Snipe cache (lightweight: 1 deleted msg per channel, max 50 channels) ─────
  const snipeCache = new Map(); // channelId -> { content, author, authorId, timestamp, attachments }
  const SNIPE_MAX_CHANNELS = 70;
  const SNIPE_EXPIRE_MS = 300000; // 5 min

  // ─── Periodic cleanup (prevent memory leaks) ─────────
  // Clean defendCooldowns every 5 min — remove entries older than cooldown period
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [userId, ts] of defendCooldowns) {
      if (now - ts > DEFEND_COOLDOWN_MS * 2) defendCooldowns.delete(userId);
    }
    // Clean failedScans/failedFetches — allow retries after 5 min
    for (const [id, entry] of failedScans) {
      if (!entry.lastTime) entry.lastTime = now;
      if (now - entry.lastTime > 300000) failedScans.delete(id);
    }
    for (const [id, entry] of failedFetches) {
      if (!entry.lastTime) entry.lastTime = now;
      if (now - entry.lastTime > 300000) failedFetches.delete(id);
    }
    // Clean expired snipe entries
    for (const [chId, entry] of snipeCache) {
      if (now - entry.timestamp > SNIPE_EXPIRE_MS) snipeCache.delete(chId);
    }
  }, 300000); // every 5 min
  activeIntervals.push(cleanupInterval);
  const DEFEND_REPLIES = [
    'wdyw from him',
    'leave him alone lol',
    'bro chill',
    'why u bothering him',
    'he doesnt care tbh',
    'yo stop',
    'let him be bro',
    'not cool man',
    'bruh leave him',
    'u good? stop tagging him',
  ];

  function pickEmoji() {
    const raw = emojiPool[Math.floor(Math.random() * emojiPool.length)];
    // Strip <: > or <a: > wrappers — react() needs "name:id" not "<:name:id>"
    const match = raw.match(/^<a?:(\w+:\d+)>$/);
    return match ? match[1] : raw;
  }

  function shouldSkip() {
    return Math.random() < SKIP_CHANCE;
  }

  // Process the reaction queue one message at a time with spacing
  async function processReactQueue() {
    if (isProcessingQueue) return; // Already running
    isProcessingQueue = true;
    while (reactQueue.length > 0) {
      // If spam mode kicked in while processing, stop and flush
      if (spamMode) {
        const flushed = reactQueue.length;
        reactQueue.length = 0;
        botLog('queue_flushed', { reason: 'spam_mode', flushed });
        console.log(`[Bot] 🛑 Queue flushed (${flushed}) — spam mode active`);
        break;
      }
      const msg = reactQueue.shift();
      // Try to react — if emoji fails, retry with others, remove broken ones
      let reacted = false;
      const tried = new Set();
      while (!reacted && tried.size < emojiPool.length) {
        const emoji = pickEmoji();
        if (tried.has(emoji)) continue;
        tried.add(emoji);
        try {
          if (tried.size === 1) await randomDelay(REACTION_DELAY_MIN, REACTION_DELAY_MAX);
          await msg.react(emoji);
          reacted = true;
          botLog('reaction', {
            emoji,
            channel: msg.channel?.name || 'DM',
            guild: msg.guild?.name || null,
            author: msg.author.tag,
            authorId: msg.author.id,
            preview: msg.content?.slice(0, 120) || '(no text)',
            messageId: msg.id,
            queueRemaining: reactQueue.length,
          });
          console.log(`[Bot] 👁️ Reacted ${emoji} to ${msg.author.tag} in #${msg.channel?.name || 'DM'} (${reactQueue.length} queued)`);
        } catch (error) {
          const errMsg = error?.message || String(error);
          if (errMsg.includes('Unknown Emoji')) {
            // Remove broken emoji from pool
            const rawIdx = emojiPool.findIndex(e => {
              const m = e.match(/^<a?:(\w+:\d+)>$/);
              return (m ? m[1] : e) === emoji;
            });
            if (rawIdx !== -1 && emojiPool.length > 1) {
              const removed = emojiPool.splice(rawIdx, 1)[0];
              saveEmojiPool();
              console.log(`[Bot] 🗑️ Removed broken emoji ${removed} from pool (${emojiPool.length} left)`);
              botLog('emoji_auto_remove', { emoji: removed, reason: 'unknown_emoji', poolSize: emojiPool.length });
            }
          } else {
            botLog('error', { action: 'react', error: errMsg, messageId: msg?.id });
            // Silently skip deleted messages / missing access
            if (errMsg.includes('Unknown Message') || errMsg.includes('Missing Access')) {
              break; // Message gone or no access — skip silently
            }
            console.error(`[Bot] ⚠️ Failed to react:`, errMsg);
            break; // Non-emoji error, don't retry
          }
        }
      }
      if (!reacted) {
        console.log(`[Bot] ⚠️ All emojis failed for message ${msg.id} — skipping`);
      }
      // If more messages are queued, wait between reactions to look natural
      if (reactQueue.length > 0) {
        await randomDelay(BURST_DEBOUNCE_MIN, BURST_DEBOUNCE_MAX);
      }
    }
    isProcessingQueue = false;
  }

  // Simulate typing then reply — looks human, avoids detection
  async function typingReply(message, text) {
    try {
      await message.channel.sendTyping();
      await randomDelay(TYPING_DELAY_MIN, TYPING_DELAY_MAX);
      await message.reply(text);
    } catch (err) {
      try { await message.reply(text); } catch { /* ok */ }
    }
  }

  client.on('messageCreate', async (message) => {
    try {
      if (!STALK_ENABLED) return;
      if (!message?.author) return;

      // ─── Emoji management commands (from target only) ─────
      // Target can DM or mention the bot to manage emoji pool
      const content = message.content?.trim() || '';
      const botId = client.user?.id;
      const isBotMentioned = message.mentions?.has(botId)
        || content.includes(`<@${botId}>`)
        || content.includes(`<@!${botId}>`);
      const isDM = !message.guild;
      const isFromTarget = message.author.id === STALK_USER_ID;

      if (isFromTarget && (isBotMentioned || isDM)) {
        // Strip mention from content
        const clean = content.replace(/<@!?\d+>/g, '').trim();
        const lower = clean.toLowerCase();

        // settings — show all current settings
        if (lower === 'settings' || lower === 'setting') {
          const lines = [
            `selfreact: ${selfReactEnabled ? 'on' : 'off'}`,
            `defend: ${defendMode === 0 ? 'off' : defendMode === 1 ? 'mentions' : 'mentions + replies'}`,
            `follow: ${vcFollow ? 'on' : 'off'}`,
            `sadreact: ${vcSadReact ? 'on' : 'off'}`,
            `crossguild: ${crossGuildLeave ? 'on' : 'off'}`,
            `stage: ${followStage ? 'on' : 'off'}`,
            `snipe: ${snipeEnabled ? 'on' : 'off'}${snipeGuilds.length ? ` (${snipeGuilds.length} guilds)` : ' (no guilds added)'}`,
          ];
          await typingReply(message, lines.join('\n'));
          return;
        }

        // selfreact on/off — toggle reaction module
        if (lower === 'selfreact on') {
          selfReactEnabled = true;
          saveSettings();
          await typingReply(message, 'aight reacting again');
          botLog('selfreact_toggle', { enabled: true });
          return;
        }
        if (lower === 'selfreact off') {
          selfReactEnabled = false;
          saveSettings();
          const flushed = reactQueue.length;
          reactQueue.length = 0;
          await typingReply(message, 'ok ill stop reacting');
          botLog('selfreact_toggle', { enabled: false, flushed });
          return;
        }
        if (lower === 'selfreact') {
          await typingReply(message, selfReactEnabled ? 'reacting rn yea' : 'nah not reacting rn');
          return;
        }

        // defend 1/2/off — defend mode (1=mention, 2=mention+reply)
        if (lower === 'defend 1') {
          defendMode = 1;
          saveSettings();
          await typingReply(message, 'aight defending mentions only');
          botLog('defend_toggle', { mode: 1 });
          return;
        }
        if (lower === 'defend 2') {
          defendMode = 2;
          saveSettings();
          await typingReply(message, 'aight defending mentions and replies');
          botLog('defend_toggle', { mode: 2 });
          return;
        }
        if (lower === 'defend on') {
          defendMode = 2;
          saveSettings();
          await typingReply(message, 'aight defending mentions and replies');
          botLog('defend_toggle', { mode: 2 });
          return;
        }
        if (lower === 'defend off') {
          defendMode = 0;
          saveSettings();
          await typingReply(message, 'ok ill stop defending');
          botLog('defend_toggle', { mode: 0 });
          return;
        }
        if (lower === 'defend') {
          const status = defendMode === 0 ? 'nah not defending rn'
            : defendMode === 1 ? 'defending mentions only rn'
            : 'defending mentions and replies rn';
          await typingReply(message, status);
          return;
        }

        // follow on/off — toggle VC following entirely
        if (lower === 'follow on') {
          const wasOff = !vcFollow;
          vcFollow = true;
          saveSettings();
          await typingReply(message, 'ok following u in vc now');
          botLog('vcfollow_toggle', { enabled: true });
          // If just turned on, check if target is already in a VC and join
          if (wasOff) {
            for (const [, g] of client.guilds.cache) {
              const m = g.members.cache.get(STALK_USER_ID);
              if (m?.voice?.channel) {
                setTimeout(async () => {
                  await safeJoinVC(m.voice.channel, g, 'follow_toggled_on');
                }, VC_JOIN_DELAY_MIN + Math.random() * (VC_JOIN_DELAY_MAX - VC_JOIN_DELAY_MIN));
                break;
              }
            }
          }
          return;
        }
        if (lower === 'follow off') {
          vcFollow = false;
          saveSettings();
          await typingReply(message, 'ok not following u in vc anymore');
          botLog('vcfollow_toggle', { enabled: false });
          return;
        }
        if (lower === 'follow') {
          await typingReply(message, vcFollow ? 'yea im following u in vc' : 'nah not following u in vc rn');
          return;
        }

        // sadreact on/off — toggle 🥺 when kicked from VC
        if (lower === 'sadreact on') {
          vcSadReact = true;
          saveSettings();
          await typingReply(message, 'ok ill be sad when kicked');
          botLog('sadreact_toggle', { enabled: true });
          return;
        }
        if (lower === 'sadreact off') {
          vcSadReact = false;
          saveSettings();
          await typingReply(message, 'ok ill be quiet when kicked');
          botLog('sadreact_toggle', { enabled: false });
          return;
        }
        if (lower === 'sadreact') {
          await typingReply(message, vcSadReact ? 'yea ill cry when kicked' : 'nah staying quiet when kicked');
          return;
        }

        // crossguild on/off — leave old guild VC when target moves cross-guild
        if (lower === 'crossguild on') {
          crossGuildLeave = true;
          saveSettings();
          await typingReply(message, 'ok cleaning up old vc when switching guilds');
          botLog('crossguild_toggle', { enabled: true });
          return;
        }
        if (lower === 'crossguild off') {
          crossGuildLeave = false;
          saveSettings();
          await typingReply(message, 'ok ill stay in old vc when u switch guilds');
          botLog('crossguild_toggle', { enabled: false });
          return;
        }
        if (lower === 'crossguild') {
          await typingReply(message, crossGuildLeave ? 'cleaning up old guild vc yea' : 'nah staying in old guild vc');
          return;
        }

        // stage on/off — follow into stage channels
        if (lower === 'stage on') {
          followStage = true;
          saveSettings();
          await typingReply(message, 'ok following into stages now');
          botLog('stage_toggle', { enabled: true });
          return;
        }
        if (lower === 'stage off') {
          followStage = false;
          saveSettings();
          await typingReply(message, 'ok ignoring stages');
          botLog('stage_toggle', { enabled: false });
          return;
        }
        if (lower === 'stage') {
          await typingReply(message, followStage ? 'following stages yea' : 'nah ignoring stages');
          return;
        }

        // snipe guilds — manage guild whitelist for snipe
        if (lower === 'snipe guilds' || lower === 'snipe list') {
          if (snipeGuilds.length === 0) {
            await typingReply(message, 'no guilds added yet, use snipe add in a server');
          } else {
            const names = snipeGuilds.map(id => {
              const g = client.guilds.cache.get(id);
              return g ? `${g.name}` : id;
            });
            await typingReply(message, `sniping in:\n${names.join('\n')}`);
          }
          return;
        }
        if (lower === 'snipe add') {
          // Add current guild
          if (!message.guild) {
            await typingReply(message, 'do this in a server not dm');
            return;
          }
          if (snipeGuilds.includes(message.guild.id)) {
            await typingReply(message, 'already sniping here');
            return;
          }
          snipeGuilds.push(message.guild.id);
          saveSettings();
          await typingReply(message, `ok sniping here now (${snipeGuilds.length} guilds)`);
          return;
        }
        if (lower === 'snipe remove') {
          if (!message.guild) {
            await typingReply(message, 'do this in a server not dm');
            return;
          }
          const idx = snipeGuilds.indexOf(message.guild.id);
          if (idx === -1) {
            await typingReply(message, 'not sniping here anyway');
            return;
          }
          snipeGuilds.splice(idx, 1);
          // Clear snipe cache for channels in this guild
          for (const [chId] of snipeCache) {
            const ch = client.channels.cache.get(chId);
            if (ch?.guild?.id === message.guild.id) snipeCache.delete(chId);
          }
          saveSettings();
          await typingReply(message, snipeGuilds.length ? `ok removed (${snipeGuilds.length} guilds left)` : 'ok removed, no guilds left');
          return;
        }
        if (lower === 'snipe reset') {
          snipeGuilds.length = 0;
          snipeCache.clear();
          saveSettings();
          await typingReply(message, 'ok cleared all guilds, snipe wont capture anything now');
          return;
        }

        // snipe on/off — toggle snipe capture
        if (lower === 'snipe on') {
          snipeEnabled = true;
          saveSettings();
          await typingReply(message, 'ok sniping deleted msgs now');
          botLog('snipe_toggle', { enabled: true });
          return;
        }
        if (lower === 'snipe off') {
          snipeEnabled = false;
          snipeCache.clear();
          saveSettings();
          await typingReply(message, 'ok not sniping anymore');
          botLog('snipe_toggle', { enabled: false });
          return;
        }

        // snipe dm — send last deleted message via DM instead of in channel
        if (lower === 'snipe dm') {
          if (!snipeEnabled) {
            await typingReply(message, 'snipe is off rn, say snipe on to enable');
            return;
          }
          const entry = snipeCache.get(message.channel.id);
          if (!entry || Date.now() - entry.timestamp > SNIPE_EXPIRE_MS) {
            await typingReply(message, 'nothing to snipe rn');
          } else {
            try {
              const dm = await client.users.cache.get(STALK_USER_ID)?.createDM()
                || await message.author.createDM();
              const s = Math.round((Date.now() - entry.timestamp) / 1000);
              const ago = s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${s % 60 ? ` ${s % 60}s` : ''}`;
              let txt = `#${message.channel?.name || 'unknown'} — **${entry.author}** (${ago} ago):\n${entry.content || '(no text)'}`;
              if (entry.attachments) txt += `\n📎 ${entry.attachments}`;
              await dm.send(txt);
              await typingReply(message, 'sent');
            } catch (e) {
              await typingReply(message, 'couldnt dm u');
            }
          }
          return;
        }

        // snipe — show last deleted message in this channel
        if (lower === 'snipe') {
          if (!snipeEnabled) {
            await typingReply(message, 'snipe is off rn, say snipe on to enable');
            return;
          }
          const entry = snipeCache.get(message.channel.id);
          if (!entry || Date.now() - entry.timestamp > SNIPE_EXPIRE_MS) {
            await typingReply(message, 'nothing to snipe rn');
          } else {
            const s = Math.round((Date.now() - entry.timestamp) / 1000);
            const ago = s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${s % 60 ? ` ${s % 60}s` : ''}`;
            let txt = `**${entry.author}** (${ago} ago):\n${entry.content || '(no text)'}`;
            if (entry.attachments) txt += `\n📎 ${entry.attachments}`;
            await typingReply(message, txt);
          }
          return;
        }

        // leave — disconnect from current VC
        if (lower === 'leave') {
          // Cancel any pending join/leave timers
          if (vcJoinTimer) { clearTimeout(vcJoinTimer); vcJoinTimer = null; }
          if (vcLeaveTimer) { clearTimeout(vcLeaveTimer); vcLeaveTimer = null; }

          let left = false;
          for (const [, g] of client.guilds.cache) {
            const conn = getVoiceConnection(g.id);
            if (conn) {
              try { conn.destroy(); } catch {}
              left = true;
            }
          }
          if (left) {
            botLog('vc_leave', { reason: 'leave_command', channel: currentVcChannelId });
            currentVcChannelId = null;
            currentVcGuildId = null;
            await typingReply(message, 'aight im out');
          } else {
            await typingReply(message, 'im not in vc rn');
          }
          return;
        }

        // aji — join whatever VC the target is currently in
        if (lower === 'aji') {
          // Cancel any pending join/leave timers — manual command takes priority
          if (vcJoinTimer) { clearTimeout(vcJoinTimer); vcJoinTimer = null; }
          if (vcLeaveTimer) { clearTimeout(vcLeaveTimer); vcLeaveTimer = null; }

          let found = null;
          for (const [, guild] of client.guilds.cache) {
            const member = guild.members.cache.get(STALK_USER_ID);
            if (member?.voice?.channel) {
              found = { channel: member.voice.channel, guild };
              break;
            }
          }
          if (!found) {
            await typingReply(message, 'he aint in vc rn');
            return;
          }
          // Skip stage channels if followStage is off
          if (!followStage && found.channel.type === 'GUILD_STAGE_VOICE') {
            await typingReply(message, 'he in a stage channel, stage follow is off rn');
            return;
          }
          try {
            // Destroy ALL existing voice connections (cross-guild cleanup)
            for (const [, g] of client.guilds.cache) {
              const conn = getVoiceConnection(g.id);
              if (conn) { try { conn.destroy(); } catch {} }
            }
            const connection = joinVoiceChannel({
              channelId: found.channel.id,
              guildId: found.guild.id,
              adapterCreator: found.guild.voiceAdapterCreator,
              selfDeaf: false,
              selfMute: true,
            });
            currentVcChannelId = found.channel.id;
            currentVcGuildId = found.guild.id;
            vcErrorLogged.clear();
            connection.on('error', () => {});
            botLog('vc_join', { channel: found.channel.name, channelId: found.channel.id, guild: found.guild.name, reason: 'aji_command' });
            await typingReply(message, 'omw');
          } catch (e) {
            const errMsg = e?.message || String(e);
            botLog('error', { action: 'aji_join', error: errMsg });
            if (errMsg.includes('Missing Permissions') || errMsg.includes('VOICE_JOIN_CHANNEL')) {
              await typingReply(message, 'no perms to join that vc');
            } else {
              await typingReply(message, 'cant join rn idk why');
            }
          }
          return;
        }

        if (lower === 'emojis') {
          const list = emojiPool.map((e, i) => `${i + 1}. ${e}`).join('\n');
          await typingReply(message, `here u go (${emojiPool.length}):\n${list}`);
          return;
        }

        // emoji add <emoji>
        if (lower.startsWith('emoji add ')) {
          const newEmoji = clean.replace(/^emoji\s+add\s+/i, '').trim();
          if (!newEmoji) return;
          if (emojiPool.includes(newEmoji)) {
            await typingReply(message, 'already got that one');
          } else {
            emojiPool.push(newEmoji);
            saveEmojiPool();
            await typingReply(message, `added ${newEmoji}`);
            botLog('emoji_add', { emoji: newEmoji, pool: [...emojiPool] });
          }
          return;
        }

        // emoji remove <emoji>
        if (lower.startsWith('emoji remove ')) {
          const toRemove = clean.replace(/^emoji\s+remove\s+/i, '').trim();
          if (!toRemove) return;
          const idx = emojiPool.indexOf(toRemove);
          if (idx === -1) {
            await typingReply(message, 'dont have that one');
          } else if (emojiPool.length <= 1) {
            await typingReply(message, 'cant remove that, need at least one');
          } else {
            emojiPool.splice(idx, 1);
            saveEmojiPool();
            await typingReply(message, `removed ${toRemove}`);
            botLog('emoji_remove', { emoji: toRemove, pool: [...emojiPool] });
          }
          return;
        }

        // emoji reset
        if (lower === 'emoji reset') {
          emojiPool = (process.env.STALK_EMOJI_POOL || STALK_EMOJI).split(',').map(e => e.trim());
          saveEmojiPool();
          await typingReply(message, `reset done, back to defaults`);
          botLog('emoji_reset', { pool: [...emojiPool] });
          return;
        }
      }

      // ─── Reaction logic (only react to target's messages) ─────
      if (message.author.id !== STALK_USER_ID) return;
      if (message.author.id === client.user?.id) return;
      if (!selfReactEnabled) return;  // Module toggled off

      // ─── Spam rate detection ──────────────────────────────────
      // Track target's message rate in a sliding window.
      // If they exceed SPAM_THRESHOLD msgs in SPAM_WINDOW → spam mode.
      // In spam mode: flush queue, ignore new msgs.
      // Exit spam mode after SPAM_COOLDOWN of silence.
      const now = Date.now();
      targetMsgTimes.push(now);
      while (targetMsgTimes.length > 0 && targetMsgTimes[0] < now - SPAM_WINDOW_MS) {
        targetMsgTimes.shift();
      }

      // Reset cooldown timer on every message — target is still talking
      if (spamCooldownTimer) { clearTimeout(spamCooldownTimer); spamCooldownTimer = null; }

      if (targetMsgTimes.length >= SPAM_THRESHOLD) {
        // Enter spam mode (or stay in it)
        if (!spamMode) {
          spamMode = true;
          // Flush any pending reactions — don't react during spam
          const flushed = reactQueue.length;
          reactQueue.length = 0;
          botLog('spam_mode_on', {
            channel: message.channel?.name || 'DM',
            author: message.author.tag,
            msgsInWindow: targetMsgTimes.length,
            flushedQueue: flushed,
          });
          console.log(`[Bot] 🛑 Spam detected (${targetMsgTimes.length} msgs in ${SPAM_WINDOW_MS / 1000}s) — paused reactions, flushed ${flushed} queued`);
        }
      }

      // Schedule cooldown exit — if no new message for SPAM_COOLDOWN, resume
      if (spamMode) {
        spamCooldownTimer = setTimeout(() => {
          spamMode = false;
          spamCooldownTimer = null;
          botLog('spam_mode_off', { cooldownMs: SPAM_COOLDOWN_MS });
          console.log(`[Bot] ✅ Spam cooldown passed — resuming reactions`);
        }, SPAM_COOLDOWN_MS);
        return; // Don't queue while in spam mode
      }

      // Only skip mechanism: random chance
      if (shouldSkip()) {
        botLog('skip', {
          channel: message.channel?.name || 'DM',
          author: message.author.tag,
          reason: 'random_skip',
          preview: message.content?.slice(0, 120) || '(no text)',
        });
        return;
      }

      // ─── Queue-based reaction system ─────────────────────────
      // Every message gets queued. The processor drains the queue
      // one at a time with REACTION_DELAY before each react, plus
      // BURST_DEBOUNCE spacing between consecutive reacts during
      // bursts. This way ALL messages get reacted to, but spaced
      // out so Discord doesn't flag it as spam.
      reactQueue.push(message);
      botLog('queued', {
        channel: message.channel?.name || 'DM',
        author: message.author.tag,
        messageId: message.id,
        queueSize: reactQueue.length,
        preview: message.content?.slice(0, 120) || '(no text)',
      });
      processReactQueue(); // Starts processor if not already running

    } catch (error) {
      botLog('error', { action: 'react', error: error?.message || String(error) });
      console.error(`[Bot] ⚠️ Failed to react:`, error?.message || error);
    }
  });

  // ─── Defend Module: react+reply when someone mentions/replies to target ──
  client.on('messageCreate', async (message) => {
    try {
      if (!STALK_ENABLED || defendMode === 0) return;
      if (!message?.author || message.author.bot) return;
      if (!message.guild) return; // Don't defend in DMs
      if (message.author.id === client.user?.id) return;
      if (message.author.id === STALK_USER_ID) return; // Don't defend against target himself

      // Check if this message mentions the target (raw content check — more reliable)
      const contentRaw = message.content || '';
      const mentionsTarget = contentRaw.includes(`<@${STALK_USER_ID}>`)
        || contentRaw.includes(`<@!${STALK_USER_ID}>`);

      // Check if replying to target's message
      let repliesToTarget = false;
      if (message.reference?.messageId) {
        try {
          const refMsg = await message.channel.messages.fetch(message.reference.messageId);
          repliesToTarget = refMsg?.author?.id === STALK_USER_ID;
        } catch { /* couldn't fetch referenced message, skip */ }
      }

      // Mode 1 = mention only, Mode 2 = mention + reply
      if (defendMode === 1 && !mentionsTarget) return;
      if (defendMode === 2 && !mentionsTarget && !repliesToTarget) return;

      // Per-user cooldown — don't harass the same person
      const userId = message.author.id;
      const now = Date.now();
      const lastDefend = defendCooldowns.get(userId) || 0;
      if (now - lastDefend < DEFEND_COOLDOWN_MS) {
        botLog('defend_skip', { reason: 'user_cooldown', userId, author: message.author.tag });
        return;
      }

      // Global spam guard — max N defends per window
      while (defendTimes.length > 0 && defendTimes[0] < now - DEFEND_SPAM_WINDOW) {
        defendTimes.shift();
      }
      if (defendTimes.length >= DEFEND_SPAM_MAX) {
        botLog('defend_skip', { reason: 'global_spam_limit', count: defendTimes.length });
        return;
      }

      // Pick a random casual reply
      const reply = DEFEND_REPLIES[Math.floor(Math.random() * DEFEND_REPLIES.length)];

      // Delay before reacting + replying
      await randomDelay(DEFEND_DELAY_MIN, DEFEND_DELAY_MAX);

      // React with a random emoji
      const emoji = pickEmoji();
      try { await message.react(emoji); } catch { /* emoji might fail, ok */ }

      // Type then reply
      await typingReply(message, reply);

      defendCooldowns.set(userId, Date.now());
      defendTimes.push(Date.now());

      botLog('defend', {
        author: message.author.tag,
        authorId: userId,
        channel: message.channel?.name || 'DM',
        reply,
        emoji,
        trigger: mentionsTarget ? 'mention' : 'reply',
        preview: message.content?.slice(0, 120) || '(no text)',
      });
      console.log(`[Bot] 🛡️ Defended target from ${message.author.tag} in #${message.channel?.name || 'DM'}`);

    } catch (error) {
      botLog('error', { action: 'defend', error: error?.message || String(error) });
      console.error(`[Bot] ⚠️ Defend error:`, error?.message || error);
    }
  });

  // ─── Snipe: capture deleted messages ──────────────────
  client.on('messageDelete', (message) => {
    try {
      if (!snipeEnabled) return;
      if (!message?.author || message.author.bot) return;
      if (!message.guild) return; // skip DMs
      // Guild whitelist check
      if (snipeGuilds.length === 0 || !snipeGuilds.includes(message.guild.id)) return;
      // Evict oldest if at cap
      if (snipeCache.size >= SNIPE_MAX_CHANNELS && !snipeCache.has(message.channel.id)) {
        // Delete the oldest entry
        let oldestKey = null, oldestTs = Infinity;
        for (const [k, v] of snipeCache) {
          if (v.timestamp < oldestTs) { oldestTs = v.timestamp; oldestKey = k; }
        }
        if (oldestKey) snipeCache.delete(oldestKey);
      }
      snipeCache.set(message.channel.id, {
        content: message.content?.slice(0, 1000) || '',
        author: message.author.tag,
        authorId: message.author.id,
        timestamp: Date.now(),
        attachments: message.attachments?.size
          ? [...message.attachments.values()].map(a => a.url).join(', ').slice(0, 500)
          : null,
      });
    } catch { /* never crash on snipe capture */ }
  });

  // ─── Voice Channel Following (debounced + error-safe) ─────

  // Helper: join a VC with all safety checks, returns connection or null
  async function safeJoinVC(channel, guild, reason) {
    if (!channel || !guild || !guild.voiceAdapterCreator) {
      console.warn('[Bot] ⚠️ Cannot join VC — channel/guild missing');
      return null;
    }
    // Skip stage channels if followStage is off
    if (!followStage && channel.type === 'GUILD_STAGE_VOICE') {
      console.log(`[Bot] 👁️ Skipping stage channel "${channel.name}" (stage follow off)`);
      botLog('vc_skip', { channel: channel.name, reason: 'stage_disabled' });
      return null;
    }

    // Cross-guild cleanup: destroy connections in ALL other guilds
    if (crossGuildLeave) {
      for (const [gId] of client.guilds.cache) {
        if (gId === guild.id) continue;
        const conn = getVoiceConnection(gId);
        if (conn) {
          try { conn.destroy(); } catch {}
          botLog('vc_leave', { guildId: gId, reason: 'cross_guild_cleanup' });
        }
      }
    }

    // Destroy existing connection in this guild to avoid stacking error listeners
    const existing = getVoiceConnection(guild.id);
    if (existing) {
      try { existing.destroy(); } catch {}
    }

    // Clear error dedup set for fresh connection
    vcErrorLogged.clear();

    try {
      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: true,
      });
      currentVcChannelId = channel.id;
      currentVcGuildId = guild.id;

      // Log encryption error ONCE per unique error message (not every fire)
      connection.on('error', (err) => {
        const msg = err?.message || String(err);
        if (!vcErrorLogged.has(msg)) {
          vcErrorLogged.add(msg);
          botLog('vc_error', { error: msg });
          console.warn(`[Bot] ⚠️ VC error (logged once):`, msg);
        }
      });
      botLog('vc_join', {
        channel: channel.name,
        channelId: channel.id,
        guild: guild.name,
        guildId: guild.id,
        reason,
      });
      console.log(`[Bot] 👁️ Joined VC "${channel.name}" (${reason})`);
      return connection;
    } catch (error) {
      const errMsg = error?.message || String(error);
      botLog('error', { action: 'vc_join', error: errMsg, reason });
      if (errMsg.includes('Missing Permissions') || errMsg.includes('VOICE_JOIN_CHANNEL')) {
        console.warn(`[Bot] ⚠️ No permission to join VC "${channel.name}"`);
      } else {
        console.error(`[Bot] ⚠️ Failed to join VC:`, errMsg);
      }
      return null;
    }
  }

  // ─── Detect bot kicked/disconnected from VC (self voice state) ────
  client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
      if (!STALK_ENABLED || !vcFollow) return;
      const botId = client.user?.id;
      if (!botId || newState.id !== botId) return;

      // Bot was in a VC and is now NOT in one (kicked or disconnected)
      if (oldState?.channel && !newState.channel && currentVcChannelId) {
        const wasInChannel = oldState.channelId === currentVcChannelId;
        if (!wasInChannel) return; // Wasn't our tracked channel

        console.log(`[Bot] 😢 Bot was removed from VC "${oldState.channel.name}"`);
        botLog('vc_kicked', { channel: oldState.channel.name, channelId: oldState.channelId, guild: oldState.guild?.name });

        // Reset state
        currentVcChannelId = null;
        currentVcGuildId = null;

        // Send 🥺 in the last text channel of that guild if vcSadReact is on
        if (vcSadReact) {
          try {
            // Find a text channel in the guild to send the sad emoji
            const guild = oldState.guild;
            if (guild) {
              // Try to find the system channel or first writable text channel
              const textChannel = guild.systemChannel
                || guild.channels.cache.find(c => c.type === 'GUILD_TEXT' && c.permissionsFor(botId)?.has('SEND_MESSAGES'));
              if (textChannel) {
                await randomDelay(1000, 3000);
                await textChannel.send('🥺');
                botLog('vc_sad_react', { channel: textChannel.name, guild: guild.name });
              }
            }
          } catch (e) {
            // Don't crash if we can't send
            botLog('error', { action: 'vc_sad_react', error: e?.message || String(e) });
          }
        }

        // Try to rejoin if the target is still in a VC (network drop / kick recovery)
        setTimeout(async () => {
          try {
            for (const [, guild] of client.guilds.cache) {
              const member = guild.members.cache.get(STALK_USER_ID);
              if (member?.voice?.channel) {
                console.log(`[Bot] 🔄 Target still in VC "${member.voice.channel.name}" — attempting rejoin...`);
                await safeJoinVC(member.voice.channel, guild, 'reconnect_after_kick');
                break;
              }
            }
          } catch (e) {
            console.warn('[Bot] ⚠️ Reconnect after kick failed:', e?.message);
          }
        }, VC_RECONNECT_DELAY + Math.random() * 3000);
      }
    } catch (error) {
      console.error('[Bot] 🛡️ Bot voice state error (prevented crash):', error?.message || error);
    }
  });

  // ─── Follow target's voice state changes ─────
  client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
      if (!STALK_ENABLED || !vcFollow) return;
      if (!newState || newState.id !== STALK_USER_ID) return;

      // Target joined or moved to a voice channel
      if (newState.channel && newState.channelId !== oldState?.channelId) {
        // Cancel pending leave — target is back/moved, don't disconnect!
        if (vcLeaveTimer) { clearTimeout(vcLeaveTimer); vcLeaveTimer = null; }

        // Already in the same channel as target? Do nothing — no need to rejoin
        if (currentVcChannelId === newState.channelId) {
          console.log(`[Bot] 👁️ Target rejoined our channel — staying put`);
          botLog('vc_stay', { channel: newState.channel?.name, channelId: newState.channelId });
          return;
        }

        // Debounce: cancel previous pending join, only follow the LAST channel
        if (vcJoinTimer) clearTimeout(vcJoinTimer);

        const targetChannelId = newState.channelId;
        const targetGuildId = newState.guild?.id;

        vcJoinTimer = setTimeout(async () => {
          try {
            // Re-fetch the channel in case it changed during the delay
            const channel = client.channels.cache.get(targetChannelId);
            const guild = channel?.guild || (targetGuildId ? client.guilds.cache.get(targetGuildId) : null);
            await safeJoinVC(channel, guild, 'follow_target');
          } catch (error) {
            botLog('error', { action: 'vc_follow', error: error?.message || String(error) });
            console.error(`[Bot] ⚠️ Failed to follow target:`, error?.message || error);
          }
        }, VC_JOIN_DELAY_MIN + Math.random() * (VC_JOIN_DELAY_MAX - VC_JOIN_DELAY_MIN));
      }

      // Target left voice entirely — wait 1-2 min then leave (cancellable)
      if (!newState.channel && oldState?.channel) {
        // Cancel any pending join — they already left
        if (vcJoinTimer) { clearTimeout(vcJoinTimer); vcJoinTimer = null; }

        const leftGuildId = oldState.guild?.id;
        if (!leftGuildId) return;
        console.log(`[Bot] 👁️ Target left VC — waiting 1-2 min before leaving...`);

        // Use a cancellable timer so if target comes back, we DON'T leave
        vcLeaveTimer = setTimeout(async () => {
          try {
            // Double-check: is the target STILL not in our channel?
            // (in case we missed a rejoin event)
            const guild = client.guilds.cache.get(leftGuildId);
            if (guild && currentVcChannelId) {
              const vc = guild.channels.cache.get(currentVcChannelId);
              if (vc && vc.members?.has(STALK_USER_ID)) {
                console.log(`[Bot] 👁️ Target is actually in our channel — NOT leaving`);
                vcLeaveTimer = null;
                return;
              }
            }
            const connection = getVoiceConnection(leftGuildId);
            if (connection) {
              connection.destroy();
              currentVcChannelId = null;
              currentVcGuildId = null;
              botLog('vc_leave', {
                guild: oldState.guild?.name || null,
                guildId: leftGuildId,
                channel: oldState.channel?.name || null,
              });
              console.log(`[Bot] 👁️ Left VC after idle wait`);
            }
          } catch (error) {
            botLog('error', { action: 'vc_leave', error: error?.message || String(error) });
            console.error(`[Bot] ⚠️ Failed to leave VC:`, error?.message || error);
          }
          vcLeaveTimer = null;
        }, VC_LEAVE_DELAY_MIN + Math.random() * (VC_LEAVE_DELAY_MAX - VC_LEAVE_DELAY_MIN));
      }
    } catch (error) {
      // Outer catch — prevents ANY voice event from crashing
      console.error('[Bot] 🛡️ Voice event error (prevented crash):', error?.message || error);
    }
  });

  // ─── Server Communication ────────────────────────────────

  let heartbeatPending = false;
  let pollPending = false;

  async function sendHeartbeat() {
    if (heartbeatPending) return; // Skip if previous call still in-flight
    heartbeatPending = true;
    try {
      await fetch(`${SERVER_URL}/api/discord/heartbeat`, {
        method: 'POST',
        headers: JSON_HEADERS,
      });
    } catch (error) { /* silent */ }
    heartbeatPending = false;
  }

  async function pollState() {
    if (pollPending) return; // Skip if previous call still in-flight
    pollPending = true;
    try {
      const response = await fetch(`${SERVER_URL}/api/discord/state`);
      if (!response.ok) return; // Server returned error — skip silently
      const state = await response.json();
      if (!state || !state.bot) return; // Malformed response
      if (state.bot.scanRequest && state.game?.channelId) {
        await handleScanRequest(state.game.channelId);
      }
      if (state.bot.fetchRequests && state.bot.fetchRequests.length > 0) {
        for (const discordId of state.bot.fetchRequests) {
          await handleFetchRequest(discordId);
        }
      }
    } catch (error) {
      // Silent — server might not be ready yet when embedded
    }
    pollPending = false;
  }

  // ─── Request Handlers ────────────────────────────────────

  async function handleScanRequest(channelId) {
    const scanFail = failedScans.get(channelId);
    if (scanFail && scanFail.count >= MAX_RETRIES) return;

    console.log(`[Bot] 🔍 Scanning voice channel: ${channelId}`);
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || channel.type !== 'GUILD_VOICE') {
        console.error('[Bot] ❌ Invalid voice channel');
        trackFailure(failedScans, channelId);
        return;
      }
      failedScans.delete(channelId);
      const players = [];
      for (const [_, member] of channel.members) {
        if (member.user.bot) continue;
        players.push({
          discordId: member.user.id,
          username: member.user.username,
          displayName: member.displayName || member.user.username,
          avatar: member.user.displayAvatarURL({ format: 'png', size: 128 }),
        });
      }
      console.log(`[Bot] ✅ Found ${players.length} players`);
      await fetch(`${SERVER_URL}/api/discord/scan-results`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ players }),
      });
    } catch (error) {
      console.error('[Bot] ❌ Scan error:', error.message);
      trackFailure(failedScans, channelId);
      const entry = failedScans.get(channelId);
      if (entry && entry.count >= MAX_RETRIES) {
        try {
          await fetch(`${SERVER_URL}/api/discord/scan-results`, {
            method: 'POST',
            headers: JSON_HEADERS,
            body: JSON.stringify({ players: [] }),
          });
        } catch (e) { /* ignore */ }
      }
    }
  }

  async function handleFetchRequest(discordId) {
    const fetchFail = failedFetches.get(discordId);
    if (fetchFail && fetchFail.count >= MAX_RETRIES) return;

    console.log(`[Bot] 🔍 Fetching user: ${discordId}`);
    try {
      const user = await client.users.fetch(discordId);
      if (!user) {
        await fetch(`${SERVER_URL}/api/discord/add-fetched`, {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({ discordId, found: false }),
        });
        return;
      }
      await fetch(`${SERVER_URL}/api/discord/add-fetched`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          discordId: user.id,
          username: user.username,
          displayName: user.displayName || user.globalName || user.username,
          avatar: user.displayAvatarURL({ format: 'png', size: 128 }),
          found: true,
        }),
      });
      console.log(`[Bot] ✅ Fetched: ${user.displayName || user.globalName || user.username}`);
      failedFetches.delete(discordId);
    } catch (error) {
      console.error(`[Bot] ❌ Fetch error ${discordId}:`, error.message);
      trackFailure(failedFetches, discordId);
      try {
        await fetch(`${SERVER_URL}/api/discord/add-fetched`, {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({ discordId, found: false }),
        });
      } catch (e) { /* ignore */ }
    }
  }

  // ─── Login with auto-reconnect ───────────────────────────

  let loginAttempts = 0;

  function attemptLogin() {
    loginAttempts++;
    botLog('login', { attempt: loginAttempts });
    console.log(`[Bot] 🚀 Starting Discord self-bot... (attempt ${loginAttempts})`);
    client.login(DISCORD_TOKEN).then(() => {
      console.log(`[Bot] ✅ Login successful — waiting for ready event...`);
    }).catch((error) => {
      botLog('error', { action: 'login', attempt: loginAttempts, error: error?.message || String(error) });
      console.error('[Bot] ❌ Failed to login:', error?.message || error);
      if (loginAttempts < MAX_LOGIN_ATTEMPTS) {
        const retryDelay = Math.min(LOGIN_RETRY_BASE * loginAttempts, LOGIN_RETRY_MAX);
        console.log(`[Bot] 🔄 Retrying login in ${retryDelay / 1000}s...`);
        setTimeout(attemptLogin, retryDelay);
      } else {
        console.error(`[Bot] ❌ Gave up after ${MAX_LOGIN_ATTEMPTS} login attempts.`);
      }
    });
  }

  attemptLogin();

  return client;
}

// ─── Standalone mode (node selfbot.js) ──────────────────────
// When run directly, start the bot in single or multi-account mode
const isStandalone = process.argv[1]?.includes('selfbot');
if (isStandalone) {
  // BOT_MODE: "single" = one token, "multi" = rotation, auto = detect from token count
  const botMode = (process.env.BOT_MODE || 'auto').toLowerCase().trim();
  const tokensRaw = process.env.DISCORD_TOKENS || '';
  const tokens = tokensRaw.split(',').map(t => t.trim()).filter(Boolean);
  const singleToken = process.env.DISCORD_TOKEN || tokens[0] || '';
  const shiftHours = Number(process.env.SHIFT_HOURS) || 12;

  const SWAP_JITTER_MIN = envNum('BOT_SWAP_JITTER_MIN', 60000);
  const SWAP_JITTER_MAX = envNum('BOT_SWAP_JITTER_MAX', 300000);
  const SWAP_LOGOUT_MIN = envNum('BOT_SWAP_LOGOUT_MIN', 3000);
  const SWAP_LOGOUT_MAX = envNum('BOT_SWAP_LOGOUT_MAX', 8000);

  // Determine effective mode
  const useMulti = botMode === 'multi' ? true
                 : botMode === 'single' ? false
                 : tokens.length >= 2;  // auto: multi if 2+ tokens

  if (!useMulti) {
    // ─── Single account mode ──────────────────────────────
    if (!singleToken) {
      console.error('[Bot] ❌ No token found. Set DISCORD_TOKEN or DISCORD_TOKENS in .env');
      process.exit(1);
    }
    console.log(`[Bot] 🔑 Single account mode`);
    startBot({ token: singleToken });

  } else if (tokens.length < 2) {
    console.error('[Bot] ❌ Multi mode requires 2+ tokens in DISCORD_TOKENS');
    process.exit(1);

  } else {
    // ─── Multi-account rotation mode ──────────────────────
    console.log(`[Rotation] 🔄 ${tokens.length} accounts loaded, ${shiftHours}h shifts`);

    let currentTokenIndex = -1;
    let shiftTimer = null;

    function getNextTokenIndex() {
      // Pick account based on time-of-day so restarts resume the correct shift
      const hourOfDay = new Date().getHours();
      return Math.floor(hourOfDay / shiftHours) % tokens.length;
    }

    async function swapAccount() {
      const nextIndex = getNextTokenIndex();
      // Same account? No swap needed (e.g. after restart mid-shift)
      if (nextIndex === currentTokenIndex && client && isReady) {
        scheduleNextSwap();
        return;
      }

      const prevTag = client?.user?.tag || '(none)';

      // Gracefully destroy old client
      if (client) {
        try {
          console.log(`[Rotation] 👋 Logging out ${prevTag}...`);
          botLog('rotation_logout', { user: prevTag, tokenIndex: currentTokenIndex });
          client.destroy();
          client = null;
          isReady = false;
        } catch (e) {
          console.warn(`[Rotation] ⚠️ Error during logout:`, e?.message || e);
        }
        // Wait 3-8s between logout and new login (don't look automated)
        await new Promise(r => setTimeout(r, SWAP_LOGOUT_MIN + Math.random() * (SWAP_LOGOUT_MAX - SWAP_LOGOUT_MIN)));
      }

      currentTokenIndex = nextIndex;
      console.log(`[Rotation] 🔑 Switching to account #${currentTokenIndex + 1}`);
      botLog('rotation_login', { tokenIndex: currentTokenIndex });

      startBot({ token: tokens[currentTokenIndex] });
      scheduleNextSwap();
    }

    function scheduleNextSwap() {
      if (shiftTimer) clearTimeout(shiftTimer);
      // Calculate ms until next shift boundary
      const now = new Date();
      const currentShiftStart = Math.floor(now.getHours() / shiftHours) * shiftHours;
      const nextShiftHour = currentShiftStart + shiftHours;
      const nextShift = new Date(now);
      nextShift.setHours(nextShiftHour, 0, 0, 0);
      if (nextShift <= now) nextShift.setDate(nextShift.getDate() + 1);
      const msUntilSwap = nextShift - now;

      // Add 1-5 min random jitter so swaps don't happen at exact shift boundaries
      const jitter = SWAP_JITTER_MIN + Math.random() * (SWAP_JITTER_MAX - SWAP_JITTER_MIN);
      const totalMs = msUntilSwap + jitter;

      const hoursLeft = (totalMs / 3600000).toFixed(1);
      console.log(`[Rotation] ⏰ Next swap in ${hoursLeft}h`);
      shiftTimer = setTimeout(swapAccount, totalMs);
    }

    // Start first account immediately
    swapAccount();
  }

  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    if (client) client.destroy();
    process.exit(0);
  });
}

// ["<:95crythumbsup:1475259342499614852>","<:hearts:1163203542438395994>","<:Pinkh:1350944510611558501>","<:b2:1340924346012798996>","<a:HY_Heartp:1116481061912850533>","<:AAAA:1466805772850561180>","<:11pm_think:1044596545514917979>","<a:Scribbledheart:1221584940760694914>","<:002P2U_CinnamorollQuestion:1320066914650689566>"]