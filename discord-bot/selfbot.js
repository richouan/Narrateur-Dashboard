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
  console.log(`🔍 Scanning voice channel: ${channelId}`);
  
  try {
    const channel = await client.channels.fetch(channelId);
    
    if (!channel || channel.type !== 'GUILD_VOICE') {
      console.error('❌ Invalid voice channel');
      return;
    }
    
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
  }
}

async function handleFetchRequest(discordId) {
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
        avatar: user.displayAvatarURL({ format: 'png', size: 128 }),
        found: true,
      }),
    });
    
    console.log(`✅ Fetched user: ${user.username}`);
  } catch (error) {
    console.error(`❌ Error fetching user ${discordId}:`, error.message);
    
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
