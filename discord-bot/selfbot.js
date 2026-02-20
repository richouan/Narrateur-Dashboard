/**
 * Discord Self-Bot for Loup-Garou Online
 * 
 * This self-bot polls the game server for scan/fetch requests
 * and adds Discord users to games automatically.
 * 
 * Setup:
 * 1. npm install discord.js-selfbot-v13
 * 2. Set DISCORD_TOKEN in .env or environment
 * 3. Set SERVER_URL (e.g., http://localhost:3000)
 * 4. Run: node selfbot.js
 */

import { Client } from 'discord.js-selfbot-v13';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load .env from root
dotenv.config();

// Configuration
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const POLL_INTERVAL = 3000; // Poll every 3 seconds
const HEARTBEAT_INTERVAL = 5000; // Send heartbeat every 5 seconds

if (!DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN environment variable is required');
  process.exit(1);
}

// Initialize Discord client
const client = new Client({ checkUpdate: false });

let isReady = false;

// Track failed attempts to avoid infinite retries
const failedScans = new Map(); // channelId -> { count }
const failedFetches = new Map(); // discordId -> { count }
const MAX_RETRIES = 2;

// ─── Discord Client Events ──────────────────────────────────

client.on('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`🔗 Connected to server: ${SERVER_URL}`);
  isReady = true;
  
  // Start polling and heartbeat
  startHeartbeat();
  startPolling();
});

client.on('error', (error) => {
  console.error('❌ Discord client error:', error);
});

// ─── Server Communication ───────────────────────────────────

async function sendHeartbeat() {
  try {
    await fetch(`${SERVER_URL}/api/discord/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Silent fail - server might be down
  }
}

async function pollState() {
  try {
    const response = await fetch(`${SERVER_URL}/api/discord/state`);
    const state = await response.json();
    
    // Handle scan request
    if (state.bot.scanRequest && state.game.channelId) {
      await handleScanRequest(state.game.channelId);
    }
    
    // Handle fetch requests
    if (state.bot.fetchRequests && state.bot.fetchRequests.length > 0) {
      for (const discordId of state.bot.fetchRequests) {
        await handleFetchRequest(discordId);
      }
    }
  } catch (error) {
    console.error('⚠️ Poll error:', error.message);
  }
}

// ─── Request Handlers ───────────────────────────────────────

async function handleScanRequest(channelId) {
  // Check if this channel has already failed MAX_RETRIES times — stop permanently
  const scanFail = failedScans.get(channelId);
  if (scanFail && scanFail.count >= MAX_RETRIES) {
    return; // Permanently skip — already failed enough times
  }

  console.log(`🔍 Scanning voice channel: ${channelId}`);
  
  try {
    const channel = await client.channels.fetch(channelId);
    
    if (!channel || channel.type !== 'GUILD_VOICE') {
      console.error('❌ Invalid voice channel');
      trackFailure(failedScans, channelId);
      return;
    }
    
    // Success - clear failure tracking
    failedScans.delete(channelId);
    
    // Get members in voice channel
    const members = channel.members;
    const players = [];
    
    for (const [_, member] of members) {
      if (member.user.bot) continue; // Skip bots
      
      players.push({
        discordId: member.user.id,
        username: member.user.username,
        displayName: member.displayName || member.user.username,
        avatar: member.user.displayAvatarURL({ format: 'png', size: 128 }),
      });
    }
    
    console.log(`✅ Found ${players.length} players in voice channel`);
    
    // Send results to server
    await fetch(`${SERVER_URL}/api/discord/scan-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ players }),
    });
    
    console.log(`📤 Sent ${players.length} players to server`);
  } catch (error) {
    console.error('❌ Error scanning channel:', error.message);
    trackFailure(failedScans, channelId);

    // If max retries reached, tell server to clear the scan request so it stops asking
    const entry = failedScans.get(channelId);
    if (entry && entry.count >= MAX_RETRIES) {
      try {
        await fetch(`${SERVER_URL}/api/discord/scan-results`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ players: [] }),
        });
        console.log(`🛑 Cleared scan request for ${channelId} after ${MAX_RETRIES} failures`);
      } catch (e) { /* ignore */ }
    }
  }
}

async function handleFetchRequest(discordId) {
  // Check if this user has already failed MAX_RETRIES times — stop permanently
  const fetchFail = failedFetches.get(discordId);
  if (fetchFail && fetchFail.count >= MAX_RETRIES) {
    return; // Permanently skip — already failed enough times
  }

  console.log(`🔍 Fetching user: ${discordId}`);
  
  try {
    const user = await client.users.fetch(discordId);
    
    if (!user) {
      // User not found
      await fetch(`${SERVER_URL}/api/discord/add-fetched`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordId,
          found: false,
        }),
      });
      console.log(`❌ User not found: ${discordId}`);
      return;
    }
    
    // Send user info to server
    await fetch(`${SERVER_URL}/api/discord/add-fetched`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discordId: user.id,
        username: user.username,
        displayName: user.displayName || user.globalName || user.username,
        avatar: user.displayAvatarURL({ format: 'png', size: 128 }),
        found: true,
      }),
    });
    
    console.log(`✅ Fetched user: ${user.displayName || user.globalName || user.username}`);
    // Success - clear failure tracking
    failedFetches.delete(discordId);
  } catch (error) {
    console.error(`❌ Error fetching user ${discordId}:`, error.message);
    trackFailure(failedFetches, discordId);
    
    // Notify server that fetch failed
    await fetch(`${SERVER_URL}/api/discord/add-fetched`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discordId,
        found: false,
      }),
    });
  }
}

// ─── Intervals ──────────────────────────────────────────────

function trackFailure(map, id) {
  const existing = map.get(id);
  if (existing) {
    existing.count++;
  } else {
    map.set(id, { count: 1 });
  }
  const entry = map.get(id);
  if (entry.count >= MAX_RETRIES) {
    console.log(`🛑 Stopped retrying ${id} (failed ${entry.count} times)`);
  }
}

function startHeartbeat() {
  setInterval(() => {
    if (isReady) {
      sendHeartbeat();
    }
  }, HEARTBEAT_INTERVAL);
}

function startPolling() {
  setInterval(() => {
    if (isReady) {
      pollState();
    }
  }, POLL_INTERVAL);
}

// ─── Start Bot ──────────────────────────────────────────────

console.log('🚀 Starting Discord self-bot...');
client.login(DISCORD_TOKEN).catch((error) => {
  console.error('❌ Failed to login:', error.message);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  client.destroy();
  process.exit(0);
});
