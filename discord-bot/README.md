# Discord Bot for Loup-Garou Online

This self-bot automatically scans Discord voice channels and fetches users to add them as players to your Loup-Garou games.

> **Note**: This bot is integrated into the main project. Dependencies are in the root `package.json`, and configuration is in the root `.env` file.

## ⚠️ Important Notice

This is a **self-bot** (user account bot), which technically violates Discord's Terms of Service. Use at your own risk. Discord may suspend or ban accounts that use self-bots.

**Alternatives:**

- Use official Discord bots (requires more complex OAuth setup)
- Add players manually through the web interface
- Use Discord IDs to fetch users one by one

## 🚀 Quick Start

### 1. Installation

Dependencies are managed at the project root:

```bash
cd .. # Go to project root
npm install
```

This installs all dependencies including Discord bot packages.

### 2. Get Your Discord Token

#### Method 1: Browser Developer Tools

1. Open Discord in your web browser
2. Press `Ctrl+Shift+I` (or `Cmd+Option+I` on Mac) to open DevTools
3. Go to the **Console** tab
4. Paste this code and press Enter:
   ```javascript
   (webpackChunkdiscord_app.push([
     [""],
     {},
     (e) => {
       m = [];
       for (let c in e.c) m.push(e.c[c]);
     },
   ]),
   m)
     .find((m) => m?.exports?.default?.getToken !== void 0)
     .exports.default.getToken();
   ```
5. Copy the token that appears (it starts with `mfa.` or is a long string)

#### Method 2: Discord Application

1. Open Discord app
2. Press `Ctrl+Shift+I` to open DevTools
3. Go to **Network** tab
4. Filter by "api"
5. Look for requests to `discord.com/api`
6. Find the `Authorization` header in any request - that's your token

### 3. Configure Environment

Add these variables to the **root** `.env` file (not in discord-bot folder):

```env
DISCORD_TOKEN=your_token_here
SERVER_URL=http://localhost:3000
```

The `.env` file should be at project root:

```
loup-garou-online/
├── .env              ← Here
├── discord-bot/
└── package.json
```

### 4. Run the Bot

From the **project root**:

```bash
npm run dev:bot
```

Or for production:

```bash
npm run start:bot
```

You should see:

```
🚀 Starting Discord self-bot...
✅ Logged in as YourName#1234
🔗 Connected to server: http://localhost:3000
```

## 📖 How It Works

### Architecture

The bot uses a **polling-based** architecture:

1. **Heartbeat**: Every 5 seconds, the bot sends a heartbeat to the server
2. **Polling**: Every 3 seconds, the bot checks for pending requests
3. **Request Processing**: Bot handles scan/fetch requests and sends results back

### Request Flow

#### Voice Channel Scanning

```
Narrator (Web UI) → Server → Bot → Discord API → Server → Game
```

1. Narrator enters a Discord voice channel ID
2. Clicks "🔍 Scanner" button
3. Server sets `scanRequest = true` flag
4. Bot polls server, sees the request
5. Bot fetches all members in the voice channel
6. Bot sends player list back to server
7. Server adds players to the game
8. WebSocket updates the UI

#### Manual User Fetch

```
Narrator (Web UI) → Server → Bot → Discord API → Server → Game
```

1. Narrator enters a Discord user ID
2. Clicks "Ajouter" button
3. Server adds ID to `fetchRequests` queue
4. Bot polls server, sees the request
5. Bot fetches user info from Discord
6. Bot sends user data back to server
7. Server adds player to the game
8. WebSocket updates the UI

## 🎮 Usage in Game

### Step 1: Start the Bot

Make sure the bot is running. In the game UI, you'll see:

- 🟢 **Bot En ligne** (green) - Bot is connected
- 🔴 **Bot Hors ligne** (red) - Bot is disconnected

### Step 2: Create a Game

1. Go to Dashboard
2. Click "Nouvelle Partie"
3. Enter game name
4. Game starts in **SETUP** phase

### Step 3: Add Players

#### Option A: Manual Entry

1. Click **✍️ Manuel** tab
2. Type player name
3. Click "Ajouter"

#### Option B: Discord Voice Scan

1. Click **🎮 Discord** tab
2. Get voice channel ID:
   - Right-click on voice channel in Discord
   - Click "Copy ID" (enable Developer Mode in Settings if needed)
3. Paste channel ID
4. Click "🔍 Scanner"
5. Wait 2-3 seconds
6. All voice channel members will be added automatically

#### Option C: Discord User ID

1. Click **🎮 Discord** tab
2. Get user ID:
   - Right-click on user in Discord
   - Click "Copy ID"
3. Paste user ID in second input
4. Press Enter or click "Ajouter"
5. User will be fetched and added

### Step 4: Assign Roles

1. Each player has a dropdown next to their name
2. Select roles from the grimoire:
   - 🐺 **Loups-Garous** (Wolves)
   - 🏘️ **Villageois** (Villagers)
   - ⚖️ **Neutres** (Neutral roles)
3. Click "💾 Sauvegarder les rôles" to save assignments

### Step 5: Start the Game

1. Click "🎭 Commencer la Partie"
2. Game transitions to FIRST_NIGHT phase
3. Follow normal game flow

## 🔧 Troubleshooting

### Bot Shows "Hors ligne" (Offline)

**Possible causes:**

- Bot process is not running
- Wrong `SERVER_URL` in environment
- Network issues
- Discord token expired

**Solutions:**

1. Check bot console for errors
2. Verify `SERVER_URL` matches your game server
3. Restart the bot: `npm start`
4. Get a fresh Discord token if needed

### "Impossible de scanner" Error

**Possible causes:**

- Bot is offline
- Invalid channel ID
- Channel is not a voice channel
- Bot account doesn't have access to that server/channel

**Solutions:**

1. Verify bot is online (green indicator)
2. Double-check the channel ID
3. Make sure your Discord account is in that server
4. Try a different voice channel

### Players Not Added After Scan

**Check:**

1. Bot console shows scan success
2. Server logs show "Discord scan: X players detected"
3. Refresh the game page
4. Check if players were already in the game (duplicates are skipped)

### Token Invalid / Login Failed

Your Discord token may have expired. Get a new one:

1. Close Discord completely
2. Reopen Discord in browser
3. Get new token using DevTools method above
4. Update `.env` file
5. Restart bot

## 🔒 Security Notes

### Token Safety

**NEVER:**

- Share your token with anyone
- Commit your token to Git
- Post your token in Discord or public forums

**Your token = full access to your account!**

### Rate Limiting

The bot polls every 3 seconds and sends heartbeats every 5 seconds. This is safe for Discord's rate limits. **Do not decrease these intervals** or you may get rate-limited.

### Self-Bot Risks

Using self-bots violates Discord ToS. Possible consequences:

- Account warning
- Temporary suspension
- Permanent ban

Use responsibly and consider alternatives for production use.

## 🐛 Debug Mode

To see detailed logs:

```bash
DEBUG=* npm start
```

Or edit `selfbot.js` and add console.logs where needed.

## 📝 API Endpoints

The bot communicates with these server endpoints:

- `GET /api/discord/state` - Poll for pending requests
- `POST /api/discord/heartbeat` - Send keepalive signal
- `POST /api/discord/scan-results` - Send scanned players
- `POST /api/discord/add-fetched` - Send fetched user info

## 🚀 Production Deployment

For production, consider:

1. **Use a proper Discord bot** instead of self-bot
2. **Add authentication** to bot endpoints (shared secret)
3. **Use Redis** for bot state (multi-instance support)
4. **Add retry logic** for failed requests
5. **Implement rate limiting** on server side
6. **Monitor bot health** with proper logging

## 📚 Resources

- [discord.js-selfbot-v13 Documentation](https://www.npmjs.com/package/discord.js-selfbot-v13)
- [Discord Developer Portal](https://discord.com/developers/docs)
- [How to Get Discord Token](https://www.androidauthority.com/get-discord-token-3149920/)

## ⚖️ Legal Disclaimer

This software is provided for educational purposes. Using self-bots violates Discord's Terms of Service. The developers are not responsible for any account actions taken by Discord. Use at your own risk.
