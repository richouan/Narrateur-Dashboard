/**
 * Discord Self-Bot for Loup-Garou Online
 * 
 * This self-bot polls the game server for scan/fetch requests,
 * adds Discord users to games, and optionally stalks a target user.
 * 
 * Can run standalone (node selfbot.js) or embedded in the Nuxt server.
 */

import { Client, RichPresence } from 'discord.js-selfbot-v13';
import Voice from 'discord.js-selfbot-v13/src/util/Voice.js';
const { joinVoiceChannel, getVoiceConnection } = Voice;
import ClientUserSettingManager from 'discord.js-selfbot-v13/src/managers/ClientUserSettingManager.js';

// Monkey-patch to fix v2.15.1 crash on login due to missing guild_folders
if (ClientUserSettingManager && ClientUserSettingManager.prototype && ClientUserSettingManager.prototype._patch) {
  const originalPatch = ClientUserSettingManager.prototype._patch;
  ClientUserSettingManager.prototype._patch = function (data) {
    if (!data) return;
    if (data.guild_folders && !Array.isArray(data.guild_folders)) {
      data.guild_folders = Object.values(data.guild_folders || {});
    }
    // and to prevent any other unhandled crashes in this method:
    try {
      originalPatch.call(this, data);
    } catch (e) {
      console.warn('[PATCH] Prevented ClientUserSettingManager._patch crash:', e.message);
    }
  };
}

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { createWriteStream, mkdirSync, statSync, renameSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { connectDB, isConnected, loadSettings as dbLoadSettings, saveSettings as dbSaveSettings, loadEmojiPool as dbLoadEmojiPool, saveEmojiPool as dbSaveEmojiPool } from './db.js';
import { pick, R } from './responses.js';

// Load .env from root (only needed for standalone mode)
dotenv.config();

// ─── ANSI color helpers for clean terminal output ───────────
const c = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  white: '\x1b[97m',
  bgRed: '\x1b[41m',
};
// Value highlighter — makes important values pop
const v = (val) => `${c.white}${c.bold}${val}${c.reset}`;       // bright white bold
const h = (val) => `${c.cyan}${val}${c.reset}`;                 // cyan accent
const g = (val) => `${c.green}${val}${c.reset}`;                // green (good)
const r = (val) => `${c.red}${val}${c.reset}`;                  // red (bad)
const d = (val) => `${c.gray}${val}${c.reset}`;                 // dim/gray
const y = (val) => `${c.yellow}${val}${c.reset}`;               // yellow
const onOff = (b) => b ? g('ON') : r('OFF');                    // boolean toggle display

const ts = () => `${c.gray}${new Date().toLocaleTimeString('en-GB')}${c.reset}`;
const pad = (label, len = 8) => label.padEnd(len);
const log = {
  sys: (...a) => console.log(`${ts()} ${c.cyan}${pad('SYS')}${c.reset}`, ...a),
  react: (...a) => console.log(`${ts()} ${c.magenta}${pad('REACT')}${c.reset}`, ...a),
  vc: (...a) => console.log(`${ts()} ${c.blue}${pad('VC')}${c.reset}`, ...a),
  defend: (...a) => console.log(`${ts()} ${c.green}${pad('DEFEND')}${c.reset}`, ...a),
  cmd: (...a) => console.log(`${ts()} ${c.white}${pad('CMD')}${c.reset}`, ...a),
  scan: (...a) => console.log(`${ts()} ${c.cyan}${pad('SCAN')}${c.reset}`, ...a),
  db: (...a) => console.log(`${ts()} ${c.yellow}${pad('DB')}${c.reset}`, ...a),
  warn: (...a) => console.warn(`${ts()} ${c.yellow}${c.bold}${pad('WARN')}${c.reset}`, ...a),
  error: (...a) => console.error(`${ts()} ${c.red}${c.bold}${pad('ERROR')}${c.reset}`, ...a),
  ok: (...a) => console.log(`${ts()} ${c.green}${c.bold}${pad('OK')}${c.reset}`, ...a),
  // Settings table helper
  settings: (source, opts) => {
    const src = source === 'mongo' ? `${c.yellow}MongoDB${c.reset}` : `${c.gray}local file${c.reset}`;
    console.log(`${ts()} ${c.green}${c.bold}${pad('OK')}${c.reset} Settings loaded from ${src}`);
    console.log(`${d('         ┌──────────────────────────────────────')}`);
    console.log(`${d('         │')}  react ${onOff(opts.react)}   defend ${v(opts.defend)}   vc ${onOff(opts.vc)}   sad ${onOff(opts.sad)}`);
    console.log(`${d('         │')}  xguild ${onOff(opts.xguild)}  stage ${onOff(opts.stage)}    snipe ${onOff(opts.snipe)}`);
    if (opts.ai !== undefined) {
      console.log(`${d('         │')}  ai ${onOff(opts.ai)}      key ${onOff(opts.key)}`);
    }
    console.log(`${d('         └──────────────────────────────────────')}`);
  },
};

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
    log.warn('Could not init log file (logging to memory only)');
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
        logStream.on('error', () => { });
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
  log.error('Uncaught exception (prevented crash):', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection (prevented crash):', reason?.message || reason);
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
    log.warn('No DISCORD_TOKEN set — Discord bot disabled');
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
    log.error('Discord error:', error?.message || error);
  });

  // WebSocket errors (connection drops, reconnect failures)
  client.on('shardError', (error) => {
    log.error('WebSocket error:', error?.message || error);
  });

  // Warn on rate limits, missing permissions, etc.
  client.on('warn', (info) => {
    log.warn('Warning:', info);
  });

  // Handle disconnects — bot will auto-reconnect
  client.on('shardDisconnect', (event, id) => {
    botLog('disconnect', { shard: id });
    log.warn(`Disconnected ${d(`(shard ${id})`)}. Auto-reconnecting...`);
    isReady = false;
  });

  // Back online after reconnect
  client.on('shardReconnecting', (id) => {
    botLog('reconnect', { shard: id, phase: 'reconnecting' });
    log.sys(`Reconnecting ${d(`(shard ${id})`)}...`);
    isReady = false;
  });

  client.on('shardResume', (id) => {
    botLog('reconnect', { shard: id, phase: 'resumed' });
    log.ok(`Resumed ${d(`(shard ${id})`)}`);
    isReady = true;
    // After a full WS reconnect, existing voice connections are dead — reset state and rejoin
    currentVcChannelId = null;
    currentVcGuildId = null;
    vcJoinLock = false;
    vcIntentionalLeave = false;
    if (vcJoinTimer) { clearTimeout(vcJoinTimer); vcJoinTimer = null; }
    if (vcLeaveTimer) { clearTimeout(vcLeaveTimer); vcLeaveTimer = null; }
    if (vcReconnectTimer) { clearTimeout(vcReconnectTimer); vcReconnectTimer = null; }
    if (STALK_ENABLED && vcFollow) {
      setTimeout(async () => {
        try {
          for (const [, g] of client.guilds.cache) {
            const m = g.members.cache.get(STALK_USER_ID);
            if (m?.voice?.channel) {
              log.vc(`Rejoining ${v(m.voice.channel.name)} after reconnect...`);
              await safeJoinVC(m.voice.channel, g, 'reconnect_resume');
              break;
            }
          }
        } catch (e) { log.warn('Post-reconnect VC rejoin failed:', e?.message); }
      }, 5000); // Wait 5s for guild cache to repopulate
    }
  });

  // Handle Captcha requirements explicitly
  client.on('captchaRequired', (request, captchaData) => {
    botLog('error', { action: 'captcha_required', details: captchaData });
    log.error(`🚨 CAPTCHA REQUIRED! Discord needs a captcha to proceed. Request: ${request?.route}`);
  });

  // Invalidated session — token revoked or account disabled
  client.on('invalidated', () => {
    log.error('Session invalidated (token may be revoked). Bot stopped.');
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
      log.warn(`Stopped retrying ${h(id)} ${d(`(failed ${entry.count} times)`)}`);
    }
  }

  // ─── Discord Client Events ──────────────────────────────

  const botStartTime = Date.now(); // Track uptime

  client.on('ready', async () => {
    log.ok(`Logged in as ${v(client.user.tag)}`);
    log.sys(`Server: ${h(SERVER_URL)}`);

    // ─── Connect to MongoDB & load persisted data ───────────
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || '';
    const dbOk = await connectDB(mongoUri);
    if (dbOk) {
      // Load settings from DB (overrides local file)
      const dbSettings = await dbLoadSettings();
      if (dbSettings) {
        if (typeof dbSettings.selfReactEnabled === 'boolean') selfReactEnabled = dbSettings.selfReactEnabled;
        if (typeof dbSettings.selfReactMode === 'string') selfReactMode = dbSettings.selfReactMode;
        if (typeof dbSettings.selfReactEmoji === 'string') selfReactEmoji = dbSettings.selfReactEmoji;
        if (typeof dbSettings.aiEnabled === 'boolean') aiEnabled = dbSettings.aiEnabled;
        if (typeof dbSettings.geminiApiKey === 'string') geminiApiKey = dbSettings.geminiApiKey;
        if ([0, 1, 2].includes(dbSettings.defendMode)) defendMode = dbSettings.defendMode;
        if (typeof dbSettings.vcFollow === 'boolean') vcFollow = dbSettings.vcFollow;
        if (typeof dbSettings.vcSadReact === 'boolean') vcSadReact = dbSettings.vcSadReact;
        if (typeof dbSettings.crossGuildLeave === 'boolean') crossGuildLeave = dbSettings.crossGuildLeave;
        if (typeof dbSettings.followStage === 'boolean') followStage = dbSettings.followStage;
        if (typeof dbSettings.snipeEnabled === 'boolean') snipeEnabled = dbSettings.snipeEnabled;
        if (Array.isArray(dbSettings.snipeGuilds)) snipeGuilds = dbSettings.snipeGuilds;
        if (Array.isArray(dbSettings.defendReplies) && dbSettings.defendReplies.length > 0) defendReplies = dbSettings.defendReplies;
        if (dbSettings.presence && typeof dbSettings.presence === 'object') presence = dbSettings.presence;
        if (Array.isArray(dbSettings.presenceProfiles)) presenceProfiles = dbSettings.presenceProfiles;
        if (typeof dbSettings.presenceEnabled === 'boolean') presenceEnabled = dbSettings.presenceEnabled;
        log.settings('mongo', { react: selfReactEnabled, mode: selfReactMode, defend: defendMode, vc: vcFollow, sad: vcSadReact, xguild: crossGuildLeave, stage: followStage, snipe: snipeEnabled, ai: aiEnabled, key: !!geminiApiKey });
      }
      // Load emoji pool from DB (overrides local file)
      const dbEmojis = await dbLoadEmojiPool();
      if (dbEmojis && Array.isArray(dbEmojis) && dbEmojis.length > 0) {
        emojiPool.length = 0;
        emojiPool.push(...dbEmojis);
        log.ok(`Emoji pool loaded from ${y('MongoDB')}: ${v(emojiPool.length)} emojis`);
      }
    }

    if (STALK_ENABLED) {
      log.sys(`Stalker mode ${g('ON')} — following ${v(STALK_USER_ID)}`);
    }
    isReady = true;
    botLog('ready', { user: client.user?.tag, server: SERVER_URL, stalk: STALK_ENABLED });
    // Apply presence (after a short delay so the connection is stable)
    setTimeout(() => applyPresence().catch(() => { }), 2000);

    // ─── Push own profile to server (for dashboard display) ─
    setTimeout(async () => {
      // Bot own profile
      try {
        const self = client.user;
        const avatar = self.displayAvatarURL({ format: 'png', size: 128, dynamic: true });
        let banner = null;
        if (self.banner) {
          banner = `https://cdn.discordapp.com/banners/${self.id}/${self.banner}.${self.banner.startsWith('a_') ? 'gif' : 'png'}?size=480`;
        }
        const displayName = self.globalName || self.username;
        await fetch(`${SERVER_URL}/api/discord/bot-profile`, {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({
            id: self.id,
            username: self.username,
            displayName,
            avatar,
            banner,
          }),
        });
        log.ok(`Bot profile cached → ${v(displayName)}${banner ? ' ✦ banner' : ''}`);
      } catch (e) {
        log.warn('Failed to push bot profile:', e?.message);
      }

      // Target profile — search guild members cache (user might not be in users cache yet)
      try {
        let target = client.users.cache.get(STALK_USER_ID);
        if (!target) {
          for (const [, guild] of client.guilds.cache) {
            const member = guild.members.cache.get(STALK_USER_ID);
            if (member?.user) { target = member.user; break; }
          }
        }
        if (target) {
          const tAvatar = target.displayAvatarURL({ format: 'png', size: 128, dynamic: true });
          let tBanner = null;
          if (target.banner) {
            tBanner = `https://cdn.discordapp.com/banners/${target.id}/${target.banner}.${target.banner.startsWith('a_') ? 'gif' : 'png'}?size=480`;
          }
          const tDisplayName = target.globalName || target.username;
          await fetch(`${SERVER_URL}/api/discord/target-profile`, {
            method: 'POST',
            headers: JSON_HEADERS,
            body: JSON.stringify({
              id: target.id,
              username: target.username,
              displayName: tDisplayName,
              avatar: tAvatar,
              banner: tBanner,
            }),
          });
          log.ok(`Target profile cached → ${v(tDisplayName)}${tBanner ? ' ✦ banner' : ''}`);
        } else {
          log.warn(`Target ${h(STALK_USER_ID)} not found in cache yet — profile not pushed`);
        }
      } catch (e) {
        log.warn('Failed to push target profile:', e?.message);
      }
    }, 3000);

    // Heartbeat
    activeIntervals.push(setInterval(() => { if (isReady) sendHeartbeat(); }, HEARTBEAT_INTERVAL));
    // Polling
    activeIntervals.push(setInterval(() => { if (isReady) pollState(); }, POLL_INTERVAL));

    // ─── Dashboard settings sync (poll MongoDB every 60s for live updates) ─────
    const SETTINGS_POLL_MS = 60000;
    activeIntervals.push(setInterval(async () => {
      try {
        const remote = await db.loadSettings();
        if (!remote) return;
        const changed = [];
        const check = (key, cur, setter) => {
          if (remote[key] !== undefined && remote[key] !== cur) {
            setter(remote[key]);
            changed.push(key);
          }
        };
        const prev = { selfReactEnabled, selfReactMode, selfReactEmoji, vcFollow, vcSadReact, crossGuildLeave, followStage, snipeEnabled, defendMode };
        if (remote.selfReactEnabled !== undefined && remote.selfReactEnabled !== selfReactEnabled) { selfReactEnabled = remote.selfReactEnabled; changed.push(`selfReact ${onOff(selfReactEnabled)}`); }
        if (remote.selfReactMode !== undefined && remote.selfReactMode !== selfReactMode) { selfReactMode = remote.selfReactMode; changed.push(`reactMode ${selfReactMode}`); }
        if (remote.selfReactEmoji !== undefined && remote.selfReactEmoji !== selfReactEmoji) { selfReactEmoji = remote.selfReactEmoji; changed.push(`reactEmoji updated`); }
        if (remote.aiEnabled !== undefined && remote.aiEnabled !== aiEnabled) { aiEnabled = remote.aiEnabled; changed.push(`aiEnabled ${onOff(aiEnabled)}`); }
        if (remote.geminiApiKey !== undefined && remote.geminiApiKey !== geminiApiKey) { geminiApiKey = remote.geminiApiKey; changed.push(`aiKey updated`); }
        if (remote.vcFollow !== undefined && remote.vcFollow !== vcFollow) { vcFollow = remote.vcFollow; changed.push(`vcFollow ${onOff(vcFollow)}`); }
        if (remote.vcSadReact !== undefined && remote.vcSadReact !== vcSadReact) { vcSadReact = remote.vcSadReact; changed.push(`sadReact ${onOff(vcSadReact)}`); }
        if (remote.crossGuildLeave !== undefined && remote.crossGuildLeave !== crossGuildLeave) { crossGuildLeave = remote.crossGuildLeave; changed.push(`crossGuild ${onOff(crossGuildLeave)}`); }
        if (remote.followStage !== undefined && remote.followStage !== followStage) { followStage = remote.followStage; changed.push(`stage ${onOff(followStage)}`); }
        if (remote.snipeEnabled !== undefined && remote.snipeEnabled !== snipeEnabled) { snipeEnabled = remote.snipeEnabled; changed.push(`snipe ${onOff(snipeEnabled)}`); }
        if (remote.defendMode !== undefined && remote.defendMode !== defendMode) { defendMode = remote.defendMode; changed.push(`defend ${v(String(remote.defendMode))}`); }
        if (remote.presence !== undefined) {
          const prev = JSON.stringify(presence);
          if (JSON.stringify(remote.presence) !== prev) {
            presence = remote.presence;
            applyPresence().catch(() => { });
            changed.push(`presence ${v(remote.presence?.activityName || 'cleared')}`);
          }
        }
        if (remote.presenceProfiles !== undefined && JSON.stringify(remote.presenceProfiles) !== JSON.stringify(presenceProfiles)) {
          presenceProfiles = remote.presenceProfiles;
          changed.push(`presenceProfiles (${presenceProfiles.length})`);
        }
        if (remote.presenceEnabled !== undefined && remote.presenceEnabled !== presenceEnabled) {
          presenceEnabled = remote.presenceEnabled;
          applyPresence().catch(() => { });
          changed.push(`presenceEnabled ${onOff(presenceEnabled)}`);
        }
        if (changed.length > 0) log.sys(`Dashboard sync: ${changed.join(', ')}`);
      } catch { /* silent — don't crash on poll failure */ }
    }, SETTINGS_POLL_MS));

    // ─── Check if target is already in a VC on startup ─────
    if (STALK_ENABLED && vcFollow) {
      try {
        for (const [, guild] of client.guilds.cache) {
          const member = guild.members.cache.get(STALK_USER_ID);
          if (member?.voice?.channel) {
            const ch = member.voice.channel;
            log.vc(`Target already in ${v(ch.name)} — joining after delay...`);
            setTimeout(async () => {
              await safeJoinVC(ch, guild, 'startup');
            }, VC_JOIN_DELAY_MIN + Math.random() * (VC_JOIN_DELAY_MAX - VC_JOIN_DELAY_MIN));
            break; // Only join one VC
          }
        }
      } catch (e) {
        log.warn('Startup VC check failed:', e?.message);
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
    if (isConnected()) dbSaveEmojiPool(emojiPool).catch(() => { });
  }
  const reactQueue = [];           // Queue of messages waiting to be reacted to
  let isProcessingQueue = false;   // Whether the queue processor is running
  const targetMsgTimes = [];       // Sliding window of target message timestamps
  let spamMode = false;            // True = target is spamming, stop reacting
  let spamCooldownTimer = null;    // Timer to exit spam mode after silence

  // ─── Persistent settings (saved to bot-settings.json) ─────
  const SETTINGS_FILE = join(dirname(fileURLToPath(import.meta.url)), 'bot-settings.json');
  let selfReactEnabled = true;
  let selfReactMode = 'random'; // 'random' or 'fixed'
  let selfReactEmoji = '';
  let aiEnabled = false;           // Moroccan Darija AI understanding
  let geminiApiKey = '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';           // API key for AI (Groq/OR/OpenAI)
  let defendMode = 0;              // 0=off, 1=mention only, 2=mention+reply
  let vcFollow = true;             // Follow target into voice channels at all
  let vcSadReact = true;           // Send 🥺 when kicked from VC
  let crossGuildLeave = true;      // Leave old guild VC when target moves cross-guild
  let followStage = false;         // Follow target into stage channels
  let snipeEnabled = false;        // Capture deleted messages for snipe command
  let snipeGuilds = [];             // Guild IDs to snipe in (empty = all guilds)
  // Rich presence: { status, activityType, activityName, activityDetails, activityState }
  let presence = null;
  // Saved presence profiles: [{ name, status, activityType, activityName, activityDetails, activityState, largeImage, largeText, smallImage, smallText }]
  let presenceProfiles = [];
  // Whether rich presence is globally enabled (can be toggled via !rp off / !rp on)
  let presenceEnabled = true;
  let defendReplies = [...R.defendReplies];

  // Load saved settings
  try {
    if (existsSync(SETTINGS_FILE)) {
      const saved = JSON.parse(readFileSync(SETTINGS_FILE, 'utf8'));
      if (typeof saved.selfReactEnabled === 'boolean') selfReactEnabled = saved.selfReactEnabled;
      if (typeof saved.selfReactMode === 'string') selfReactMode = saved.selfReactMode;
      if (typeof saved.selfReactEmoji === 'string') selfReactEmoji = saved.selfReactEmoji;
      if (typeof saved.aiEnabled === 'boolean') aiEnabled = saved.aiEnabled;
      if (typeof saved.geminiApiKey === 'string') geminiApiKey = saved.geminiApiKey;
      if ([0, 1, 2].includes(saved.defendMode)) defendMode = saved.defendMode;
      if (typeof saved.vcFollow === 'boolean') vcFollow = saved.vcFollow;
      if (typeof saved.vcSadReact === 'boolean') vcSadReact = saved.vcSadReact;
      if (typeof saved.crossGuildLeave === 'boolean') crossGuildLeave = saved.crossGuildLeave;
      if (typeof saved.followStage === 'boolean') followStage = saved.followStage;
      if (typeof saved.snipeEnabled === 'boolean') snipeEnabled = saved.snipeEnabled;
      if (Array.isArray(saved.snipeGuilds)) snipeGuilds = saved.snipeGuilds;
      if (Array.isArray(saved.defendReplies) && saved.defendReplies.length > 0) defendReplies = saved.defendReplies;
      if (saved.presence && typeof saved.presence === 'object') presence = saved.presence;
      if (Array.isArray(saved.presenceProfiles)) presenceProfiles = saved.presenceProfiles;
      if (typeof saved.presenceEnabled === 'boolean') presenceEnabled = saved.presenceEnabled;
      log.settings('local', { react: selfReactEnabled, mode: selfReactMode, defend: defendMode, vc: vcFollow, sad: vcSadReact, xguild: crossGuildLeave, stage: followStage, snipe: snipeEnabled, ai: aiEnabled });
    }
  } catch { /* use defaults */ }

  function saveSettings() {
    const data = { selfReactEnabled, selfReactMode, selfReactEmoji, aiEnabled, geminiApiKey, defendMode, vcFollow, vcSadReact, crossGuildLeave, followStage, snipeEnabled, snipeGuilds, defendReplies, presence, presenceProfiles, presenceEnabled };
    try { writeFileSync(SETTINGS_FILE, JSON.stringify(data), 'utf8'); } catch { /* ok */ }
    if (isConnected()) dbSaveSettings(data).catch(() => { });
  }

  // ─── Rich Presence ────────────────────────────────────────
  const ACTIVITY_TYPES = { PLAYING: 0, LISTENING: 2, WATCHING: 3, COMPETING: 5, CUSTOM: 4 };
  const STATUS_LABELS = { online: '🟢 Online', idle: '🟡 Idle', dnd: '🔴 Do Not Disturb', invisible: '⚫ Invisible' };

  async function applyPresence() {
    if (!client?.user) return;
    try {
      if (!presenceEnabled) {
        client.user.setPresence({ status: 'invisible', activities: [] });
        log.sys('Presence disabled — set to invisible');
        return;
      }
      if (!presence || !presence.activityName) {
        const st = presence?.status || 'online';
        client.user.setPresence({ status: st, activities: [] });
        log.sys(`Presence → ${STATUS_LABELS[st] ?? st}`);
        return;
      }

      const typeKey = (presence.activityType || 'PLAYING').toUpperCase();

      // Use RichPresence builder — required for buttons/assets to serialize correctly
      const rp = new RichPresence();
      rp.setName(presence.activityName);
      rp.setType(typeKey);
      if (presence.activityDetails?.trim()) rp.setDetails(presence.activityDetails.trim());
      if (presence.activityState?.trim()) rp.setState(presence.activityState.trim());

      // ─── Images ───────────────────────────────────────────
      const largeUrl = presence.largeImage?.trim();
      const smallUrl = presence.smallImage?.trim();
      let hasImg = false;
      if (largeUrl || smallUrl) {
        try {
          const resolved = await RichPresence.getExternal(
            client, client.user.id,
            largeUrl || '',
            smallUrl || '',
          );
          if (largeUrl && resolved[0]?.external_asset_path) {
            rp.setAssetsLargeImage(`mp:${resolved[0].external_asset_path}`);
            if (presence.largeText?.trim()) rp.setAssetsLargeText(presence.largeText.trim());
            hasImg = true;
          }
          const smallIdx = largeUrl ? 1 : 0;
          if (smallUrl && resolved[smallIdx]?.external_asset_path) {
            rp.setAssetsSmallImage(`mp:${resolved[smallIdx].external_asset_path}`);
            if (presence.smallText?.trim()) rp.setAssetsSmallText(presence.smallText.trim());
          }
        } catch (imgErr) {
          log.warn(`Presence image resolve failed (no image): ${imgErr?.message}`);
        }
      }

      // ─── Buttons ──────────────────────────────────────────
      let btnCount = 0;
      try {
        if (presence.button1Label?.trim() && presence.button1Url?.trim()) {
          rp.addButton(presence.button1Label.trim().slice(0, 32), presence.button1Url.trim());
          btnCount++;
        }
        if (presence.button2Label?.trim() && presence.button2Url?.trim()) {
          rp.addButton(presence.button2Label.trim().slice(0, 32), presence.button2Url.trim());
          btnCount++;
        }
      } catch (btnErr) {
        log.warn(`Presence button error (skipped): ${btnErr?.message}`);
      }

      // ─── Party ────────────────────────────────────────────
      const partyCur = Number(presence.partyCurrent);
      const partyMax = Number(presence.partyMax);
      let hasParty = false;
      if (partyCur > 0 && partyMax > 0 && partyCur <= partyMax) {
        try { rp.setParty({ current: partyCur, max: partyMax }); hasParty = true; } catch { /* skip */ }
      }

      client.user.setPresence({ status: presence.status || 'online', activities: [rp] });
      log.sys(`Presence → ${STATUS_LABELS[presence.status] ?? presence.status} / ${typeKey} ${v(presence.activityName)}${hasImg ? ' ✦ img' : ''}${btnCount ? ` ✦ ${btnCount}btn` : ''}${hasParty ? ` ✦ party` : ''}`);
    } catch (e) {
      log.warn('Failed to apply presence:', e?.message);
    }
  }
  const defendCooldowns = new Map(); // userId -> last defend timestamp
  const defendTimes = [];            // Sliding window of defend action timestamps

  // ─── Voice state (declared here so all code can access) ─────
  let vcJoinTimer = null;           // Debounce rapid channel switches
  let vcLeaveTimer = null;          // Delayed leave after target disconnects
  let vcReconnectTimer = null;      // Timer for reconnect_after_kick
  let vcJoinLock = false;           // Prevent overlapping VC joins
  let vcErrorLogged = new Set();    // Track already-logged vc errors (dedup)
  let currentVcChannelId = null;    // Track which VC we're currently in
  let currentVcGuildId = null;      // Track which guild the bot is connected to
  let lastSadReactTime = 0;        // Cooldown for 🥺 (prevent spam)
  const SAD_REACT_COOLDOWN = 120000; // 2 min between sad reacts
  let vcIntentionalLeave = false;   // True when bot destroys its own connection (following target) — suppress sad react

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
        log.react(`Queue flushed ${y(flushed)} — spam mode active`);
        break;
      }
      const msg = reactQueue.shift();
      // Try to react — if emoji fails, retry with others, remove broken ones
      let reacted = false;
      const tried = new Set();
      while (!reacted && tried.size < emojiPool.length) {
        let emoji = '';
        if (selfReactMode === 'fixed' && selfReactEmoji) {
          emoji = selfReactEmoji.trim();
          // Strip <: > or <a: > wrappers just like pickEmoji does
          const match = emoji.match(/^<a?:(\w+:\d+)>$/);
          if (match) emoji = match[1];
        } else {
          emoji = pickEmoji();
        }

        if (tried.has(emoji)) {
          if (selfReactMode === 'fixed') break; // Don't infinite loop if fixed emoji fails
          continue;
        }
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
          log.react(`${emoji} → ${v(msg.author.tag)} in ${h('#' + (msg.channel?.name || 'DM'))} ${d(`(${reactQueue.length} queued)`)}`);
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
              log.react(`Removed broken emoji ${r(removed)} ${d(`(${emojiPool.length} left)`)}`);
              botLog('emoji_auto_remove', { emoji: removed, reason: 'unknown_emoji', poolSize: emojiPool.length });
            }
          } else {
            botLog('error', { action: 'react', error: errMsg, messageId: msg?.id });
            // Silently skip deleted messages / missing access
            if (errMsg.includes('Unknown Message') || errMsg.includes('Missing Access')) {
              break; // Message gone or no access — skip silently
            }
            log.warn('Failed to react:', errMsg);
            break; // Non-emoji error, don't retry
          }
        }
      }
      if (!reacted) {
        log.warn(`All emojis failed for message ${msg.id} — skipping`);
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

  // ─── AI Command Mapper (Moroccan Darija ➔ System Command) ───
  async function mapToCommand(darijaText, apiKey) {
    const isGroq = apiKey.startsWith('gsk_');
    const isOR = apiKey.startsWith('sk-or-');
    const isGrok = apiKey.startsWith('xai-');

    let endpoint = 'https://api.openai.com/v1/chat/completions';
    let model = 'gpt-4o-mini';

    if (isGroq) {
      endpoint = 'https://api.groq.com/openai/v1/chat/completions';
      model = 'llama-3.3-70b-versatile';
    } else if (isOR) {
      endpoint = 'https://openrouter.ai/api/v1/chat/completions';
      model = 'google/gemini-2.5-flash'; // fast, free, very good at darija
    } else if (isGrok) {
      endpoint = 'https://api.xai.com/v1/chat/completions';
      model = 'grok-2-latest';
    }

    const systemPrompt = `You are a Moroccan Darija translator for a Discord bot. 
Your ONLY job is to read the user's sentence in Moroccan Darija and map it EXACTLY to one of the following system commands.
DO NOT reply with conversational text. ONLY reply with the exact command string. If you don't understand, reply with UNKNOWN.

Available Commands:
- "settings" (view settings)
- "status" (view status)
- "wech" (ping/alive check)
- "selfreact on" / "selfreact off" (toggle reactions)
- "selfreact mode random" (pick random emoji)
- "defend off" / "defend 1" / "defend 2" (defend mode - 1 is mentions only, 2 is mentions+replies)
- "follow on" / "follow off" (toggle vc following)
- "sadreact on" / "sadreact off" (toggle crying when kicked)
- "crossguild on" / "crossguild off" (toggle leaving old vc on switch)
- "stage on" / "stage off" (toggle following into stages)
- "snipe on" / "snipe off" (capture deleted msgs)
- "leave" (disconnect from VC)
- "aji" (join VC now)
- "rp clear" (clear presence profile)
- "rp on" / "rp off" (toggle presence)

Examples:
- User: "3ti chwia tasamou7 w bki labkiti" -> sadreact on
- User: "aji l vocal" -> aji
- User: "ch3l defend" -> defend 2
- User: "tfi tbrzite" -> selfreact off
- User: "wach rak 7ay" -> wech
- User: "kifach chof setting" -> settings
- User: "khoroj mn l vocal" -> leave
- User: "chuf aji m3aya" -> follow on
- User: "matb9ach dkhl m3aya l stage" -> stage off`;

    const body = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: darijaText }
      ],
      temperature: 0.1,
      max_tokens: 30
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      throw new Error(`AI API Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const result = data.choices[0]?.message?.content?.trim() || 'UNKNOWN';

    // Ensure the AI didn't hallucinate extra text mapping.
    const allowedPrefixes = ['settings', 'status', 'wech', 'selfreact', 'defend', 'follow', 'sadreact', 'crossguild', 'stage', 'snipe', 'leave', 'aji', 'rp'];
    const lowerResult = result.toLowerCase();

    if (result === 'UNKNOWN') return 'UNKNOWN';

    if (!allowedPrefixes.some(p => lowerResult.startsWith(p))) {
      return 'UNKNOWN'; // AI hallucinated something outside our command list
    }

    return lowerResult;
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

      if (isFromTarget) {
        console.log('[DEBUG] Target Sent Message ->', { isBotMentioned, isDM, content, botId, hasMentions: !!message.mentions, mentionedUsers: message.mentions?.users?.map(u => u.id) });
      }

      // Replying to one of the bot's messages counts as a mention
      const isReplyToBot = !!message.reference?.messageId && (() => {
        try {
          const ref = message.channel?.messages?.cache?.get(message.reference.messageId);
          return ref?.author?.id === botId;
        } catch { return false; }
      })();

      if (isFromTarget && (isBotMentioned || isDM || isReplyToBot)) {
        // Strip mention from content
        const clean = content.replace(/<@!?\d+>/g, '').trim();
        const lower = clean.toLowerCase();
        console.log('[DEBUG] Command Attempt ->', { isBotMentioned, isDM, isReplyToBot, content, clean, lower, aiEnabled, hasKey: !!geminiApiKey });

        // help — show available commands
        if (lower === 'help' || lower === 'commands' || lower === 'cmds') {
          await typingReply(message, [
            'yo here u go',
            'settings - see whats on/off',
            'status - check how im doing',
            'wech - see if im alive',
            'selfreact on/off - toggle reactions',
            'selfreact mode random - pick random emoji',
            'selfreact mode fixed <emoji> - react with just one emoji',
            'defend off/1/2 - defend mode',
            'follow on/off - vc following',
            'sadreact on/off - cry when kicked',
            'crossguild on/off - leave old vc on switch',
            'stage on/off - follow into stages',
            'snipe on/off - capture deleted msgs',
            'snipe add/remove/guilds/reset - manage servers',
            'snipe - show last deleted msg here',
            'snipe dm - send it to ur dms',
            'leave - get out of vc',
            'aji - join ur vc rn',
            'emojis - see emoji pool',
            'emoji add/remove/reset - manage emojis',
            'replies - see defend replies',
            'reply add/remove - manage replies',
            'rp list - see saved presence profiles',
            'rp apply <name/n> - apply a profile',
            'rp save <name> - save current as profile',
            'rp delete <name/n> - remove a profile',
            'rp on/off - enable / disable presence',
            'rp clear - just online, no activity',
          ].join('\n'));
          return;
        }

        // wech — ping / alive check
        if (lower === 'wech') {
          const ping = Math.round(client.ws.ping);
          await typingReply(message, pick(R.wech).replace('{ms}', ping));
          return;
        }

        // status — show bot status (uptime, memory, queue, vc, db)
        if (lower === 'status') {
          const upSec = Math.floor((Date.now() - botStartTime) / 1000);
          const h = Math.floor(upSec / 3600);
          const m = Math.floor((upSec % 3600) / 60);
          const uptime = h > 0 ? `${h}h ${m}m` : `${m}m`;
          const mem = Math.round(process.memoryUsage().rss / 1024 / 1024);
          const vcName = currentVcChannelId
            ? (client.channels.cache.get(currentVcChannelId)?.name || 'some channel')
            : null;
          const ping = Math.round(client.ws.ping);
          const dbUp = isConnected();
          // Build a casual human-sounding paragraph
          const prefix = pick(R.statusPrefix)
            .replace('{uptime}', uptime)
            .replace('{mem}', mem);
          const vcPart = vcName
            ? pick(R.statusVcIn).replace('{vc}', vcName)
            : pick(R.statusVcOut);
          const dbPart = dbUp ? pick(R.statusDbOk) : pick(R.statusDbNo);
          const pingPart = pick(R.statusPing).replace('{ms}', ping);
          let txt = prefix + vcPart + dbPart + pingPart;
          if (reactQueue.length > 0) txt += `, ${reactQueue.length} msgs waiting`;
          await typingReply(message, txt);
          return;
        }

        // settings — show all current settings
        if (lower === 'settings' || lower === 'setting') {
          const lines = [
            `selfreact: ${selfReactEnabled ? 'on' : 'off'}`,
            `reactmode: ${selfReactMode} ${selfReactMode === 'fixed' ? `(${selfReactEmoji || 'none set'})` : ''}`,
            `defend: ${defendMode === 0 ? 'off' : defendMode === 1 ? 'mentions' : 'mentions + replies'}`,
            `follow: ${vcFollow ? 'on' : 'off'}`,
            `sadreact: ${vcSadReact ? 'on' : 'off'}`,
            `crossguild: ${crossGuildLeave ? 'on' : 'off'}`,
            `stage: ${followStage ? 'on' : 'off'}`,
            `snipe: ${snipeEnabled ? 'on' : 'off'}${snipeGuilds.length ? ` (${snipeGuilds.length} guilds)` : ' (no guilds added)'}`,
            `replies: ${defendReplies.length} loaded`,
          ];
          await typingReply(message, `${pick(R.settingsShow)}\n${lines.join('\n')}`);
          return;
        }

        // selfreact on/off — toggle reaction module
        if (lower === 'selfreact on') {
          selfReactEnabled = true;
          saveSettings();
          await typingReply(message, pick(R.selfReactOn));
          botLog('selfreact_toggle', { enabled: true });
          return;
        }
        if (lower === 'selfreact off') {
          selfReactEnabled = false;
          saveSettings();
          const flushed = reactQueue.length;
          reactQueue.length = 0;
          await typingReply(message, pick(R.selfReactOff));
          botLog('selfreact_toggle', { enabled: false, flushed });
          return;
        }
        if (lower === 'selfreact') {
          await typingReply(message, pick(selfReactEnabled ? R.selfReactQuery : R.selfReactOff));
          return;
        }

        // selfreact mode random — change react mode to random
        if (lower === 'selfreact mode random') {
          selfReactMode = 'random';
          saveSettings();
          await typingReply(message, pick(R.selfReactModeRandom));
          botLog('selfreact_mode', { mode: 'random' });
          return;
        }

        // selfreact mode fixed <emoji> — change react mode to specific emoji
        if (lower.startsWith('selfreact mode fixed')) {
          const rest = clean.replace(/^selfreact\s+mode\s+fixed+/i, '').trim();
          if (!rest) {
            await typingReply(message, pick(R.selfReactModeFixedMissingEmoji));
            return;
          }
          selfReactMode = 'fixed';
          selfReactEmoji = rest;
          saveSettings();
          await typingReply(message, pick(R.selfReactModeFixed).replace('{e}', selfReactEmoji));
          botLog('selfreact_mode', { mode: 'fixed', emoji: selfReactEmoji });
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
          await typingReply(message, pick(R.followOn));
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
          await typingReply(message, pick(R.followOff));
          botLog('vcfollow_toggle', { enabled: false });
          return;
        }
        if (lower === 'follow') {
          await typingReply(message, pick(vcFollow ? R.followOn : R.followOff));
          return;
        }

        // sadreact on/off — toggle 🥺 when kicked from VC
        if (lower === 'sadreact on') {
          vcSadReact = true;
          saveSettings();
          await typingReply(message, pick(R.sadReactOn));
          botLog('sadreact_toggle', { enabled: true });
          return;
        }
        if (lower === 'sadreact off') {
          vcSadReact = false;
          saveSettings();
          await typingReply(message, pick(R.sadReactOff));
          botLog('sadreact_toggle', { enabled: false });
          return;
        }
        if (lower === 'sadreact') {
          await typingReply(message, pick(vcSadReact ? R.sadReactOn : R.sadReactOff));
          return;
        }

        // crossguild on/off — leave old guild VC when target moves cross-guild
        if (lower === 'crossguild on') {
          crossGuildLeave = true;
          saveSettings();
          await typingReply(message, pick(R.crossGuildOn));
          botLog('crossguild_toggle', { enabled: true });
          return;
        }
        if (lower === 'crossguild off') {
          crossGuildLeave = false;
          saveSettings();
          await typingReply(message, pick(R.crossGuildOff));
          botLog('crossguild_toggle', { enabled: false });
          return;
        }
        if (lower === 'crossguild') {
          await typingReply(message, pick(crossGuildLeave ? R.crossGuildOn : R.crossGuildOff));
          return;
        }

        // stage on/off — follow into stage channels
        if (lower === 'stage on') {
          followStage = true;
          saveSettings();
          await typingReply(message, pick(R.stageOn));
          botLog('stage_toggle', { enabled: true });
          return;
        }
        if (lower === 'stage off') {
          followStage = false;
          saveSettings();
          await typingReply(message, pick(R.stageOff));
          botLog('stage_toggle', { enabled: false });
          return;
        }
        if (lower === 'stage') {
          await typingReply(message, pick(followStage ? R.stageOn : R.stageOff));
          return;
        }

        // snipe guilds — manage guild whitelist for snipe
        if (lower === 'snipe guilds' || lower === 'snipe list') {
          if (snipeGuilds.length === 0) {
            await typingReply(message, pick(R.snipeNoGuilds));
          } else {
            const names = snipeGuilds.map(id => {
              const g = client.guilds.cache.get(id);
              return g ? `${g.name} ` : id;
            });
            await typingReply(message, `sniping in: \n${names.join('\n')} `);
          }
          return;
        }
        if (lower === 'snipe add') {
          // Add current guild
          if (!message.guild) {
            await typingReply(message, pick(R.snipeNotInServer));
            return;
          }
          if (snipeGuilds.includes(message.guild.id)) {
            await typingReply(message, pick(R.snipeAddDupe));
            return;
          }
          snipeGuilds.push(message.guild.id);
          saveSettings();
          await typingReply(message, pick(R.snipeAddOk).replace('{n}', snipeGuilds.length));
          return;
        }
        if (lower === 'snipe remove') {
          if (!message.guild) {
            await typingReply(message, pick(R.snipeNotInServer));
            return;
          }
          const idx = snipeGuilds.indexOf(message.guild.id);
          if (idx === -1) {
            await typingReply(message, pick(R.snipeRemoveNone));
            return;
          }
          snipeGuilds.splice(idx, 1);
          // Clear snipe cache for channels in this guild
          for (const [chId] of snipeCache) {
            const ch = client.channels.cache.get(chId);
            if (ch?.guild?.id === message.guild.id) snipeCache.delete(chId);
          }
          saveSettings();
          await typingReply(message, pick(R.snipeRemoveOk).replace('{n}', snipeGuilds.length));
          return;
        }
        if (lower === 'snipe reset') {
          snipeGuilds.length = 0;
          snipeCache.clear();
          saveSettings();
          await typingReply(message, pick(R.snipeResetOk));
          return;
        }

        // snipe on/off — toggle snipe capture
        if (lower === 'snipe on') {
          snipeEnabled = true;
          saveSettings();
          await typingReply(message, pick(R.snipeOn));
          botLog('snipe_toggle', { enabled: true });
          return;
        }
        if (lower === 'snipe off') {
          snipeEnabled = false;
          snipeCache.clear();
          saveSettings();
          await typingReply(message, pick(R.snipeOff));
          botLog('snipe_toggle', { enabled: false });
          return;
        }

        // snipe dm — send last deleted message via DM instead of in channel
        if (lower === 'snipe dm') {
          if (!snipeEnabled) {
            await typingReply(message, pick(R.snipeIsOff));
            return;
          }
          const entry = snipeCache.get(message.channel.id);
          if (!entry || Date.now() - entry.timestamp > SNIPE_EXPIRE_MS) {
            await typingReply(message, pick(R.snipeNothing));
          } else {
            try {
              const dm = await client.users.cache.get(STALK_USER_ID)?.createDM()
                || await message.author.createDM();
              const s = Math.round((Date.now() - entry.timestamp) / 1000);
              const ago = s < 60 ? `${s} s` : `${Math.floor(s / 60)}m${s % 60 ? ` ${s % 60}s` : ''} `;
              let txt = `#${message.channel?.name || 'unknown'} - ${entry.author} (${ago} ago): \n${entry.content || '(no text)'} `;
              if (entry.attachments) txt += `\n${entry.attachments} `;
              await dm.send(txt);
              await typingReply(message, pick(R.snipeDmSent));
            } catch (e) {
              await typingReply(message, pick(R.snipeDmFailed));
            }
          }
          return;
        }

        // snipe — show last deleted message in this channel
        if (lower === 'snipe') {
          if (!snipeEnabled) {
            await typingReply(message, pick(R.snipeIsOff));
            return;
          }
          const entry = snipeCache.get(message.channel.id);
          if (!entry || Date.now() - entry.timestamp > SNIPE_EXPIRE_MS) {
            await typingReply(message, pick(R.snipeNothing));
          } else {
            const s = Math.round((Date.now() - entry.timestamp) / 1000);
            const ago = s < 60 ? `${s} s` : `${Math.floor(s / 60)}m${s % 60 ? ` ${s % 60}s` : ''} `;
            let txt = `${entry.author} (${ago} ago): \n${entry.content || '(no text)'} `;
            if (entry.attachments) txt += `\n${entry.attachments} `;
            await typingReply(message, txt);
          }
          return;
        }

        // ─── Rich Presence profiles ────────────────────────────
        // rp list — list saved profiles
        if (lower === 'rp list' || lower === 'rp') {
          if (presenceProfiles.length === 0) {
            await typingReply(message, pick(R.rpNoProfiles));
          } else {
            const lines = presenceProfiles.map((p, i) =>
              `${i + 1}. ${p.name} — ${p.activityType?.toLowerCase() ?? 'playing'} ${p.activityName ?? ''}${p.status !== 'online' ? ` (${p.status})` : ''} `
            );
            const status = presenceEnabled ? `presence is on` : `presence is off(say rp on to turn on)`;
            await typingReply(message, `saved presence profiles: \n${lines.join('\n')} \n\n${status} `);
          }
          return;
        }

        // rp apply <name or number> — load a saved profile
        const rpApplyMatch = lower.match(/^rp apply (.+)$/);
        if (rpApplyMatch) {
          const query = rpApplyMatch[1].trim();
          const byIndex = /^\d+$/.test(query) ? presenceProfiles[parseInt(query) - 1] : null;
          const byName = presenceProfiles.find(p => p.name.toLowerCase() === query.toLowerCase());
          const profile = byName || byIndex;
          if (!profile) {
            await typingReply(message, pick(R.rpNotFound).replace('{query}', query));
            return;
          }
          presence = { ...profile };
          delete presence.name;
          presenceEnabled = true;
          saveSettings();
          applyPresence().catch(() => { });
          await typingReply(message, pick(R.rpApplied).replace('{name}', profile.name));
          return;
        }

        // rp save <name> — save current presence as a profile
        const rpSaveMatch = lower.match(/^rp save (.+)$/);
        if (rpSaveMatch) {
          const name = clean.slice('rp save '.length).trim();
          if (!presence || !presence.activityName) {
            await typingReply(message, pick(R.rpNoPresence));
            return;
          }
          const existing = presenceProfiles.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
          const entry = { name, ...presence };
          if (existing >= 0) presenceProfiles[existing] = entry;
          else presenceProfiles.push(entry);
          saveSettings();
          await typingReply(message, pick(R.rpSaved).replace('{name}', name).replace('{n}', presenceProfiles.length));
          return;
        }

        // rp delete <name or number> — remove a saved profile
        const rpDelMatch = lower.match(/^rp delete (.+)$/);
        if (rpDelMatch) {
          const query = rpDelMatch[1].trim();
          const byIndex = /^\d+$/.test(query) ? parseInt(query) - 1 : -1;
          const byName = presenceProfiles.findIndex(p => p.name.toLowerCase() === query.toLowerCase());
          const idx = byName >= 0 ? byName : byIndex;
          if (idx < 0 || idx >= presenceProfiles.length) {
            await typingReply(message, pick(R.rpNotFoundDel).replace('{query}', query));
            return;
          }
          const removed = presenceProfiles.splice(idx, 1)[0];
          saveSettings();
          await typingReply(message, pick(R.rpDeleted).replace('{name}', removed.name));
          return;
        }

        // rp off — disable presence (set invisible)
        if (lower === 'rp off') {
          presenceEnabled = false;
          saveSettings();
          client.user.setPresence({ status: 'invisible', activities: [] });
          await typingReply(message, pick(R.rpOff));
          return;
        }

        // rp on — re-enable presence
        if (lower === 'rp on') {
          presenceEnabled = true;
          saveSettings();
          applyPresence().catch(() => { });
          await typingReply(message, presence?.activityName
            ? pick(R.rpOn).replace('{name}', presence.activityName)
            : pick(R.rpOnNoActivity));
          return;
        }

        // rp clear — just online, no activity
        if (lower === 'rp clear') {
          presence = null;
          presenceEnabled = true;
          saveSettings();
          client.user.setPresence({ status: 'online', activities: [] });
          await typingReply(message, pick(R.rpClear));
          return;
        }

        // leave — disconnect from current VC
        if (lower === 'leave') {
          // Cancel ALL pending timers
          if (vcJoinTimer) { clearTimeout(vcJoinTimer); vcJoinTimer = null; }
          if (vcLeaveTimer) { clearTimeout(vcLeaveTimer); vcLeaveTimer = null; }
          if (vcReconnectTimer) { clearTimeout(vcReconnectTimer); vcReconnectTimer = null; }

          // Suppress sad react — this is intentional, not a kick
          lastSadReactTime = Date.now();
          // Clear tracked channel BEFORE destroying so the kicked handler ignores this
          currentVcChannelId = null;
          currentVcGuildId = null;

          let left = false;
          for (const [, g] of client.guilds.cache) {
            const conn = getVoiceConnection(g.id);
            if (conn) {
              try { conn.destroy(); } catch { }
              left = true;
            }
          }
          if (left) {
            botLog('vc_leave', { reason: 'leave_command' });
            await typingReply(message, pick(R.leaveOk));
          } else {
            await typingReply(message, pick(R.leaveNotInVc));
          }
          return;
        }

        // where — show which VC the bot is currently in
        if (lower === 'where' || lower === 'where r u' || lower === 'where are u' || lower === 'where are you') {
          if (!currentVcChannelId) {
            await typingReply(message, pick(R.whereNotInVc));
            return;
          }
          const ch = client.channels.cache.get(currentVcChannelId);
          if (ch) {
            await typingReply(message, pick(R.whereInVc).replace('{ch}', ch.name).replace('{guild}', ch.guild?.name || 'unknown server'));
          } else {
            await typingReply(message, pick(R.whereNotInVc));
          }
          return;
        }

        // aji — join whatever VC the target is currently in
        if (lower === 'aji') {
          // Cancel ALL pending timers — manual command takes full priority
          if (vcJoinTimer) { clearTimeout(vcJoinTimer); vcJoinTimer = null; }
          if (vcLeaveTimer) { clearTimeout(vcLeaveTimer); vcLeaveTimer = null; }
          if (vcReconnectTimer) { clearTimeout(vcReconnectTimer); vcReconnectTimer = null; }

          let found = null;
          for (const [, guild] of client.guilds.cache) {
            const member = guild.members.cache.get(STALK_USER_ID);
            if (member?.voice?.channel) {
              found = { channel: member.voice.channel, guild };
              break;
            }
          }
          if (!found) {
            await typingReply(message, pick(R.ajiNotInVc));
            return;
          }
          // Skip stage channels if followStage is off
          if (!followStage && found.channel.type === 'GUILD_STAGE_VOICE') {
            await typingReply(message, pick(R.ajiStageBlocked));
            return;
          }
          // Already in that channel — no need to do anything
          if (currentVcChannelId === found.channel.id) {
            await typingReply(message, pick(R.ajiAlready));
            return;
          }
          const conn = await safeJoinVC(found.channel, found.guild, 'aji_command');
          if (conn) {
            botLog('vc_join', { channel: found.channel.name, channelId: found.channel.id, guild: found.guild.name, reason: 'aji_command' });
            await typingReply(message, pick(R.ajiJoining));
          } else {
            await typingReply(message, pick(R.ajiFailed));
          }
          return;
        }

        if (lower === 'emojis') {
          const list = emojiPool.map((e, i) => `${i + 1}. ${e} `).join('\n');
          await typingReply(message, `${pick(R.emojiListHeader).replace('{n}', emojiPool.length)} \n${list} `);
          return;
        }

        // emoji add <emoji>
        if (lower.startsWith('emoji add ')) {
          const newEmoji = clean.replace(/^emoji\s+add\s+/i, '').trim();
          if (!newEmoji) return;
          if (emojiPool.includes(newEmoji)) {
            await typingReply(message, pick(R.emojiAddDupe));
          } else {
            emojiPool.push(newEmoji);
            saveEmojiPool();
            await typingReply(message, pick(R.emojiAddOk).replace('{e}', newEmoji));
            botLog('emoji_add', { emoji: newEmoji, pool: [...emojiPool] });
          }
          return;
        }

        // emoji remove <emoji or number>
        if (lower.startsWith('emoji remove ')) {
          const arg = clean.replace(/^emoji\s+remove\s+/i, '').trim();
          if (!arg) return;
          // Try as 1-based number first
          const num = parseInt(arg, 10);
          let idx = -1;
          if (!isNaN(num) && num >= 1 && num <= emojiPool.length) {
            idx = num - 1;
          } else {
            idx = emojiPool.indexOf(arg);
          }
          if (idx === -1) {
            await typingReply(message, pick(R.emojiRemoveNone));
          } else if (emojiPool.length <= 1) {
            await typingReply(message, pick(R.emojiNeedOne));
          } else {
            const removed = emojiPool[idx];
            emojiPool.splice(idx, 1);
            saveEmojiPool();
            await typingReply(message, pick(R.emojiRemoveOk).replace('{e}', removed));
            botLog('emoji_remove', { emoji: removed, pool: [...emojiPool] });
          }
          return;
        }

        // replies — show all defend replies
        if (lower === 'replies') {
          const list = defendReplies.map((r, i) => `${i + 1}. ${r} `).join('\n');
          await typingReply(message, `${pick(R.replyListHeader).replace('{n}', defendReplies.length)} \n${list} `);
          return;
        }

        // reply add <text>
        if (lower.startsWith('reply add ')) {
          const newReply = clean.replace(/^reply\s+add\s+/i, '').trim();
          if (!newReply) return;
          if (defendReplies.includes(newReply)) {
            await typingReply(message, pick(R.replyAddDupe));
          } else {
            defendReplies.push(newReply);
            saveSettings();
            await typingReply(message, pick(R.replyAddOk).replace('{n}', defendReplies.length));
            botLog('reply_add', { reply: newReply, count: defendReplies.length });
          }
          return;
        }

        // reply remove <text or number>
        if (lower.startsWith('reply remove ')) {
          const arg = clean.replace(/^reply\s+remove\s+/i, '').trim();
          if (!arg) return;
          // Try as number first
          const num = parseInt(arg, 10);
          let idx = -1;
          if (!isNaN(num) && num >= 1 && num <= defendReplies.length) {
            idx = num - 1;
          } else {
            idx = defendReplies.indexOf(arg);
          }
          if (idx === -1) {
            await typingReply(message, pick(R.replyRemoveNone));
          } else if (defendReplies.length <= 1) {
            await typingReply(message, pick(R.replyNeedOne));
          } else {
            const removed = defendReplies.splice(idx, 1)[0];
            saveSettings();
            await typingReply(message, pick(R.replyRemoveOk).replace('{n}', defendReplies.length));
            botLog('reply_remove', { reply: removed, count: defendReplies.length });
          }
          return;
        }

        // emoji reset
        if (lower === 'emoji reset') {
          emojiPool = (process.env.STALK_EMOJI_POOL || STALK_EMOJI).split(',').map(e => e.trim());
          saveEmojiPool();
          await typingReply(message, pick(R.emojiReset));
          botLog('emoji_reset', { pool: [...emojiPool] });
          return;
        }

        // ─── AI Command Parser Fallback ───────────────────────────
        // If the command wasn't matched above, and AI is enabled with a key,
        // try to map the Darija text to a proper system command.
        if (aiEnabled && geminiApiKey && !message.isAiMapped) {
          try {
            await message.channel.sendTyping();
            const translatedCmd = await mapToCommand(clean, geminiApiKey);

            if (translatedCmd === 'UNKNOWN') {
              await typingReply(message, pick(R.aiUnknown));
              botLog('ai_unknown', { input: clean });
              return;
            }

            // Assign the translated command to "lower" and "clean" 
            // then recursively call the whole command block logic by
            // just triggering a fake message event with the new content,
            // OR we can just re-execute the block. Re-firing is safer.
            botLog('ai_mapped', { input: clean, mapped: translatedCmd });

            // Create a pseudo-message object that inherits from the original
            // but has the mapped content, so the upper logic catches it.
            const fakeMsg = Object.create(message);
            fakeMsg.content = `<@${client.user.id}> ${translatedCmd}`;
            fakeMsg.mentions = message.mentions;
            fakeMsg.isAiMapped = true; // Prevents infinite loops!

            client.emit('messageCreate', fakeMsg);
            return; // let the recursive call handle the actual command

          } catch (err) {
            log.error('AI Parser Error:', err.message || err);
            await typingReply(message, pick(R.aiError));
            return;
          }
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
          log.react(`Spam detected ${r(`${targetMsgTimes.length} msgs`)} in ${SPAM_WINDOW_MS / 1000} s — paused, flushed ${y(flushed)} `);
        }
      }

      // Schedule cooldown exit — if no new message for SPAM_COOLDOWN, resume
      if (spamMode) {
        spamCooldownTimer = setTimeout(() => {
          spamMode = false;
          spamCooldownTimer = null;
          botLog('spam_mode_off', { cooldownMs: SPAM_COOLDOWN_MS });
          log.ok('Spam cooldown passed — resuming reactions');
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
      log.error('Failed to react:', error?.message || error);
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
      const mentionsTarget = contentRaw.includes(`< @${STALK_USER_ID}> `)
        || contentRaw.includes(`< @!${STALK_USER_ID}> `);

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
      const reply = defendReplies[Math.floor(Math.random() * defendReplies.length)];

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
      log.defend(`Defended from ${v(message.author.tag)} in ${h('#' + (message.channel?.name || 'DM'))} `);

    } catch (error) {
      botLog('error', { action: 'defend', error: error?.message || String(error) });
      log.error('Defend error:', error?.message || error);
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
      log.warn('Cannot join VC — channel/guild missing');
      return null;
    }
    // Prevent overlapping joins (double join = connection corruption)
    if (vcJoinLock) {
      log.vc(`Join skipped ${d('(already joining)')} `);
      return null;
    }
    vcJoinLock = true;

    // Skip stage channels if followStage is off
    if (!followStage && channel.type === 'GUILD_STAGE_VOICE') {
      log.vc(`Skipping stage ${h(channel.name)} ${d('(stage follow off)')} `);
      botLog('vc_skip', { channel: channel.name, reason: 'stage_disabled' });
      vcJoinLock = false;
      return null;
    }

    // Permission check — don't even attempt if we can't see/join the channel
    try {
      const perms = channel.permissionsFor(client.user);
      const canView = perms?.has('VIEW_CHANNEL') ?? true;
      const canConnect = perms?.has('CONNECT') ?? true;
      if (!canView || !canConnect) {
        const missing = [!canView && 'VIEW_CHANNEL', !canConnect && 'CONNECT'].filter(Boolean).join(', ');
        log.vc(`No access to ${v(channel.name)} ${d(`(missing: ${missing})`)} — skip`);
        botLog('vc_skip', { channel: channel.name, channelId: channel.id, reason: 'no_permission', missing });
        vcJoinLock = false;
        return null;
      }
    } catch { /* permissionsFor may throw on partial channels — skip silently */ }

    // Cross-guild cleanup: destroy connections in OTHER guilds only
    if (crossGuildLeave) {
      for (const [gId] of client.guilds.cache) {
        if (gId === guild.id) continue;
        const conn = getVoiceConnection(gId);
        if (conn) {
          vcIntentionalLeave = true;
          // Safety: auto-reset the flag after 3s in case the voiceStateUpdate never fires
          setTimeout(() => { vcIntentionalLeave = false; }, 3000);
          try { conn.destroy(); } catch { }
          botLog('vc_leave', { guildId: gId, reason: 'cross_guild_cleanup' });
        }
      }
    }

    // If already connected in the SAME guild, just move (no destroy = no leave event = no glitch)
    const existingSameGuild = getVoiceConnection(guild.id);
    if (!existingSameGuild) {
      // Fresh connection — clear error dedup set
      vcErrorLogged.clear();
    }
    // If existingSameGuild exists, we reuse it: joinVoiceChannel will move us silently

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

      // Log encryption error ONCE per unique error message — only attach on fresh connections
      // (same-guild moves reuse the existing connection object, avoid stacking listeners)
      if (!existingSameGuild) {
        connection.on('error', (err) => {
          const msg = err?.message || String(err);
          if (!vcErrorLogged.has(msg)) {
            vcErrorLogged.add(msg);
            botLog('vc_error', { error: msg });
            log.warn('VC error (logged once):', msg);
          }
        });
      }
      botLog('vc_join', {
        channel: channel.name,
        channelId: channel.id,
        guild: guild.name,
        guildId: guild.id,
        reason,
      });
      const wasSameGuild = !!existingSameGuild;
      log.vc(`${wasSameGuild ? 'Moved to' : 'Joined'} ${v(channel.name)} ${d(`(${reason})`)} `);
      vcJoinLock = false;
      return connection;
    } catch (error) {
      const errMsg = error?.message || String(error);
      botLog('error', { action: 'vc_join', error: errMsg, reason });
      if (errMsg.includes('Missing Permissions') || errMsg.includes('VOICE_JOIN_CHANNEL')) {
        log.warn(`No permission to join ${v(channel.name)} `);
      } else {
        log.error('Failed to join VC:', errMsg);
      }
      vcJoinLock = false;
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

        // If WE initiated this leave (following target to new channel), skip sad react and reconnect
        if (vcIntentionalLeave) {
          vcIntentionalLeave = false;
          currentVcChannelId = null;
          currentVcGuildId = null;
          log.vc(`Left ${v(oldState.channel.name)} ${d('(following target)')} `);
          return;
        }

        log.vc(`Removed from ${v(oldState.channel.name)} `);
        botLog('vc_kicked', { channel: oldState.channel.name, channelId: oldState.channelId, guild: oldState.guild?.name });

        // Reset state
        currentVcChannelId = null;
        currentVcGuildId = null;

        // Send 🥺 ONCE (cooldown prevents spam during rejoin loops)
        if (vcSadReact && (Date.now() - lastSadReactTime) > SAD_REACT_COOLDOWN) {
          lastSadReactTime = Date.now();
          try {
            const guild = oldState.guild;
            if (guild) {
              let textChannel = oldState.channel;
              if (!textChannel || !textChannel.permissionsFor(botId)?.has('SEND_MESSAGES')) {
                textChannel = guild.systemChannel
                  || guild.channels.cache.find(c => c.type === 'GUILD_TEXT' && c.permissionsFor(botId)?.has('SEND_MESSAGES'));
              }
              if (textChannel) {
                await randomDelay(1000, 3000);
                await textChannel.send(pick(R.sadReact));
                botLog('vc_sad_react', { channel: textChannel.name, guild: guild.name });
              }
            }
          } catch (e) {
            botLog('error', { action: 'vc_sad_react', error: e?.message || String(e) });
          }
        }

        // Try to rejoin if the target is still in a VC (network drop / kick recovery)
        // Cancel any existing reconnect timer first
        if (vcReconnectTimer) { clearTimeout(vcReconnectTimer); vcReconnectTimer = null; }

        // Add a longer delay before attempting to reconnect to prevent rapid loops
        vcReconnectTimer = setTimeout(async () => {
          vcReconnectTimer = null;
          try {
            for (const [, guild] of client.guilds.cache) {
              const member = guild.members.cache.get(STALK_USER_ID);
              if (member?.voice?.channel) {
                // Don't reconnect if a follow_target join is already pending
                if (vcJoinTimer) {
                  log.vc(`Skipping reconnect ${d('(follow_target pending)')} `);
                  return;
                }

                // Check if we are already in the channel (prevent double join)
                if (currentVcChannelId === member.voice.channel.id) {
                  log.vc(`Already in ${v(member.voice.channel.name)} ${d('(skipping reconnect)')} `);
                  return;
                }

                log.vc(`Target still in ${v(member.voice.channel.name)} — attempting rejoin...`);
                await safeJoinVC(member.voice.channel, guild, 'reconnect_after_kick');
                break;
              }
            }
          } catch (e) {
            log.warn('Reconnect after kick failed:', e?.message);
          }
        }, VC_RECONNECT_DELAY + 5000 + Math.random() * 5000); // Increased delay to 5-10s + base delay
      }
    } catch (error) {
      log.error('Bot voice state error (prevented crash):', error?.message || error);
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
        // Cancel pending reconnect — follow_target takes priority
        if (vcReconnectTimer) { clearTimeout(vcReconnectTimer); vcReconnectTimer = null; }

        // Already in the same channel as target? Do nothing — no need to rejoin
        if (currentVcChannelId === newState.channelId) {
          log.vc('Target rejoined our channel — staying put');
          botLog('vc_stay', { channel: newState.channel?.name, channelId: newState.channelId });
          return;
        }

        // Debounce: cancel previous pending join, only follow the LAST channel
        if (vcJoinTimer) clearTimeout(vcJoinTimer);

        const targetChannelId = newState.channelId;
        const targetGuildId = newState.guild?.id;

        vcJoinTimer = setTimeout(async () => {
          vcJoinTimer = null; // Always clear self-reference so reconnect checks work correctly
          try {
            // Re-fetch the channel — try cache first, then API fallback if missing
            let channel = client.channels.cache.get(targetChannelId);
            if (!channel) {
              try { channel = await client.channels.fetch(targetChannelId); } catch { }
            }
            const guild = channel?.guild || (targetGuildId ? client.guilds.cache.get(targetGuildId) : null);
            await safeJoinVC(channel, guild, 'follow_target');
          } catch (error) {
            botLog('error', { action: 'vc_follow', error: error?.message || String(error) });
            log.error('Failed to follow target:', error?.message || error);
          }
        }, VC_JOIN_DELAY_MIN + Math.random() * (VC_JOIN_DELAY_MAX - VC_JOIN_DELAY_MIN));
      }

      // Target left voice entirely — wait 1-2 min then leave (cancellable)
      if (!newState.channel && oldState?.channel) {
        // Cancel any pending join or reconnect — they already left
        if (vcJoinTimer) { clearTimeout(vcJoinTimer); vcJoinTimer = null; }
        if (vcReconnectTimer) { clearTimeout(vcReconnectTimer); vcReconnectTimer = null; }

        const leftGuildId = oldState.guild?.id;
        if (!leftGuildId) return;
        log.vc('Target left VC — waiting 1-2 min before leaving...');

        // Use a cancellable timer so if target comes back, we DON'T leave
        vcLeaveTimer = setTimeout(async () => {
          try {
            // Double-check: is the target STILL not in our channel?
            // (in case we missed a rejoin event)
            const guild = client.guilds.cache.get(leftGuildId);
            if (guild && currentVcChannelId) {
              const vc = guild.channels.cache.get(currentVcChannelId);
              if (vc && vc.members?.has(STALK_USER_ID)) {
                log.vc('Target is actually in our channel — NOT leaving');
                vcLeaveTimer = null;
                return;
              }
            }
            const connection = getVoiceConnection(leftGuildId);
            if (connection) {
              // Clear state BEFORE destroy so the kicked handler ignores this intentional leave
              currentVcChannelId = null;
              currentVcGuildId = null;
              vcIntentionalLeave = true;
              setTimeout(() => { vcIntentionalLeave = false; }, 3000);
              connection.destroy();
              botLog('vc_leave', {
                guild: oldState.guild?.name || null,
                guildId: leftGuildId,
                channel: oldState.channel?.name || null,
              });
              log.vc('Left VC after idle wait');
            }
          } catch (error) {
            botLog('error', { action: 'vc_leave', error: error?.message || String(error) });
            log.error('Failed to leave VC:', error?.message || error);
          }
          vcLeaveTimer = null;
        }, VC_LEAVE_DELAY_MIN + Math.random() * (VC_LEAVE_DELAY_MAX - VC_LEAVE_DELAY_MIN));
      }
    } catch (error) {
      // Outer catch — prevents ANY voice event from crashing
      log.error('Voice event error (prevented crash):', error?.message || error);
    }
  });

  // ─── Server Communication ────────────────────────────────

  let heartbeatPending = false;
  let pollPending = false;
  let profilePushCounter = 0;
  const PROFILE_PUSH_EVERY = 12; // re-push every ~1 min (12 × 5s)

  async function pushProfiles() {
    try {
      const self = client.user;
      const avatar = self.displayAvatarURL({ format: 'png', size: 128, dynamic: true });
      let banner = null;
      if (self.banner) {
        banner = `https://cdn.discordapp.com/banners/${self.id}/${self.banner}.${self.banner.startsWith('a_') ? 'gif' : 'png'}?size=480`;
      }
      await fetch(`${SERVER_URL}/api/discord/bot-profile`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ id: self.id, username: self.username, displayName: self.globalName || self.username, avatar, banner }),
      });
    } catch { /* silent */ }
    try {
      let target = client.users.cache.get(STALK_USER_ID);
      if (!target) {
        for (const [, guild] of client.guilds.cache) {
          const member = guild.members.cache.get(STALK_USER_ID);
          if (member?.user) { target = member.user; break; }
        }
      }
      if (target) {
        const tAvatar = target.displayAvatarURL({ format: 'png', size: 128, dynamic: true });
        let tBanner = null;
        if (target.banner) {
          tBanner = `https://cdn.discordapp.com/banners/${target.id}/${target.banner}.${target.banner.startsWith('a_') ? 'gif' : 'png'}?size=480`;
        }
        await fetch(`${SERVER_URL}/api/discord/target-profile`, {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({ id: target.id, username: target.username, displayName: target.globalName || target.username, avatar: tAvatar, banner: tBanner }),
        });
      }
    } catch { /* silent */ }
  }

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
    // Re-push profiles periodically so server-restarts auto-recover
    profilePushCounter++;
    if (profilePushCounter >= PROFILE_PUSH_EVERY) {
      profilePushCounter = 0;
      pushProfiles().catch(() => { });
    }
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
      // Instant settings update pushed from dashboard
      if (state.bot.pendingSettingsUpdate) {
        const u = state.bot.pendingSettingsUpdate;
        const changed = [];
        if (u.selfReactEnabled !== undefined && u.selfReactEnabled !== selfReactEnabled) { selfReactEnabled = u.selfReactEnabled; changed.push(`selfReact ${onOff(selfReactEnabled)}`); }
        if (u.selfReactMode !== undefined && u.selfReactMode !== selfReactMode) { selfReactMode = u.selfReactMode; changed.push(`reactMode ${selfReactMode}`); }
        if (u.selfReactEmoji !== undefined && u.selfReactEmoji !== selfReactEmoji) { selfReactEmoji = u.selfReactEmoji; changed.push(`reactEmoji updated`); }
        if (u.aiEnabled !== undefined && u.aiEnabled !== aiEnabled) { aiEnabled = u.aiEnabled; changed.push(`aiEnabled ${onOff(aiEnabled)}`); }
        if (u.geminiApiKey !== undefined && u.geminiApiKey !== geminiApiKey) { geminiApiKey = u.geminiApiKey; changed.push(`aiKey updated`); }
        if (u.vcFollow !== undefined && u.vcFollow !== vcFollow) { vcFollow = u.vcFollow; changed.push(`vcFollow ${onOff(vcFollow)}`); }
        if (u.vcSadReact !== undefined && u.vcSadReact !== vcSadReact) { vcSadReact = u.vcSadReact; changed.push(`sadReact ${onOff(vcSadReact)}`); }
        if (u.crossGuildLeave !== undefined && u.crossGuildLeave !== crossGuildLeave) { crossGuildLeave = u.crossGuildLeave; changed.push(`crossGuild ${onOff(crossGuildLeave)}`); }
        if (u.followStage !== undefined && u.followStage !== followStage) { followStage = u.followStage; changed.push(`stage ${onOff(followStage)}`); }
        if (u.snipeEnabled !== undefined && u.snipeEnabled !== snipeEnabled) { snipeEnabled = u.snipeEnabled; changed.push(`snipe ${onOff(snipeEnabled)}`); }
        if (u.defendMode !== undefined && u.defendMode !== defendMode) { defendMode = u.defendMode; changed.push(`defend ${v(String(u.defendMode))}`); }
        if (Array.isArray(u.defendReplies) && u.defendReplies.length > 0) {
          defendReplies.length = 0;
          defendReplies.push(...u.defendReplies);
          changed.push(`replies ${v(String(u.defendReplies.length))}`);
        }
        if (u.presence !== undefined) {
          presence = u.presence;
          applyPresence().catch(() => { });
          changed.push(`presence ${v(u.presence?.activityName || 'cleared')}`);
        }
        if (u.presenceProfiles !== undefined) {
          presenceProfiles = Array.isArray(u.presenceProfiles) ? u.presenceProfiles : presenceProfiles;
          changed.push(`presenceProfiles (${presenceProfiles.length})`);
        }
        if (u.presenceEnabled !== undefined && u.presenceEnabled !== presenceEnabled) {
          presenceEnabled = u.presenceEnabled;
          applyPresence().catch(() => { });
          changed.push(`presenceEnabled ${onOff(presenceEnabled)}`);
        }
        if (changed.length > 0) log.sys(`Dashboard ⇒ ${changed.join(', ')}`);
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

    log.scan(`Scanning voice channel ${h(channelId)}`);
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || channel.type !== 'GUILD_VOICE') {
        log.error('Invalid voice channel');
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
      log.ok(`Found ${v(players.length)} players`);
      await fetch(`${SERVER_URL}/api/discord/scan-results`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ players }),
      });
    } catch (error) {
      log.error('Scan error:', error.message);
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

    log.scan(`Fetching user ${h(discordId)}`);
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
      log.ok(`Fetched ${v(user.displayName || user.globalName || user.username)}`);
      failedFetches.delete(discordId);
    } catch (error) {
      log.error(`Fetch error ${h(discordId)}:`, error.message);
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
    log.sys(`Starting self-bot... ${d(`(attempt ${loginAttempts})`)}`);
    client.login(DISCORD_TOKEN).then(() => {
      log.ok('Login successful — waiting for ready event...');
    }).catch((error) => {
      botLog('error', { action: 'login', attempt: loginAttempts, error: error?.message || String(error) });
      log.error('Failed to login:', error?.message || error);
      if (loginAttempts < MAX_LOGIN_ATTEMPTS) {
        const retryDelay = Math.min(LOGIN_RETRY_BASE * loginAttempts, LOGIN_RETRY_MAX);
        log.sys(`Retrying login in ${v(retryDelay / 1000 + 's')}...`);
        setTimeout(attemptLogin, retryDelay);
      } else {
        log.error(`Gave up after ${MAX_LOGIN_ATTEMPTS} login attempts.`);
      }
    });
  }

  attemptLogin();

  return client;
}

// ─── Standalone mode (node selfbot.js) ──────────────────────
// When run directly, start the bot in single or multi-account mode
const currentFilePath = fileURLToPath(import.meta.url);
const isStandalone =
  process.argv[1] === currentFilePath ||
  process.env.pm_exec_path === currentFilePath ||
  process.argv[1]?.endsWith('selfbot.js') ||
  process.env.pm_exec_path?.endsWith('selfbot.js');

if (isStandalone) {
  console.log('');
  console.log(`  ${c.cyan}${c.bold}╔════════════════════════════════════════╗${c.reset}`);
  console.log(`  ${c.cyan}${c.bold}║${c.reset}                                        ${c.cyan}${c.bold}║${c.reset}`);
  console.log(`  ${c.cyan}${c.bold}║${c.reset}   ${c.white}${c.bold}L O U P - G A R O U${c.reset}  ${c.dim}selfbot${c.reset}      ${c.cyan}${c.bold}║${c.reset}`);
  console.log(`  ${c.cyan}${c.bold}║${c.reset}                                        ${c.cyan}${c.bold}║${c.reset}`);
  console.log(`  ${c.cyan}${c.bold}║${c.reset}   ${c.gray}discord.js-selfbot-v13${c.reset}               ${c.cyan}${c.bold}║${c.reset}`);
  console.log(`  ${c.cyan}${c.bold}║${c.reset}   ${c.gray}node ${process.version}${c.reset}                       ${c.cyan}${c.bold}║${c.reset}`);
  console.log(`  ${c.cyan}${c.bold}║${c.reset}                                        ${c.cyan}${c.bold}║${c.reset}`);
  console.log(`  ${c.cyan}${c.bold}╚════════════════════════════════════════╝${c.reset}`);
  console.log('');
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
      log.error('No token found. Set DISCORD_TOKEN or DISCORD_TOKENS in .env');
      process.exit(1);
    }
    log.sys('Single account mode');
    startBot({ token: singleToken });

  } else if (tokens.length < 2) {
    log.error('Multi mode requires 2+ tokens in DISCORD_TOKENS');
    process.exit(1);

  } else {
    // ─── Multi-account rotation mode ──────────────────────
    log.sys(`Rotation mode: ${v(tokens.length)} accounts, ${v(shiftHours + 'h')} shifts`);

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
          log.sys(`Logging out ${v(prevTag)}...`);
          botLog('rotation_logout', { user: prevTag, tokenIndex: currentTokenIndex });
          client.destroy();
          client = null;
          isReady = false;
        } catch (e) {
          log.warn('Error during logout:', e?.message || e);
        }
        // Wait 3-8s between logout and new login (don't look automated)
        await new Promise(r => setTimeout(r, SWAP_LOGOUT_MIN + Math.random() * (SWAP_LOGOUT_MAX - SWAP_LOGOUT_MIN)));
      }

      currentTokenIndex = nextIndex;
      log.sys(`Switching to account ${v('#' + (currentTokenIndex + 1))}`);
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
      log.sys(`Next swap in ${v(hoursLeft + 'h')}`);
      shiftTimer = setTimeout(swapAccount, totalMs);
    }

    // Start first account immediately
    swapAccount();
  }

  process.on('SIGINT', () => {
    log.sys('Shutting down...');
    if (client) client.destroy();
    process.exit(0);
  });
}

// ["<:95crythumbsup:1475259342499614852>","<:hearts:1163203542438395994>","<:Pinkh:1350944510611558501>","<:b2:1340924346012798996>","<a:HY_Heartp:1116481061912850533>","<:AAAA:1466805772850561180>","<:11pm_think:1044596545514917979>","<a:Scribbledheart:1221584940760694914>","<:002P2U_CinnamorollQuestion:1320066914650689566>"]