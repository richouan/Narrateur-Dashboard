# 🐺 Loup-Garou Online - Deployment Guide

## 📦 Project Structure

```
loup-garou-online/
├── app/                      # Nuxt frontend
├── server/                   # Nuxt server & API
│   ├── api/
│   │   ├── discord/          # Discord bot API endpoints (ESSENTIAL!)
│   │   ├── games/           # Game management
│   │   └── auth/            # Authentication
│   └── models/              # MongoDB schemas
├── discord-bot/             # Discord self-bot client
│   ├── selfbot.js          # Bot that polls your server
│   └── README.md           # Bot documentation
├── package.json            # Single package.json (Heroku-friendly)
├── Procfile                # Heroku process definition
└── .env                    # Environment variables
```

## 🔑 Important Architecture Clarification

### Two Separate Components:

1. **API Endpoints** (`server/api/discord/*.ts`):
   - These are **server-side API routes**
   - Run as part of your Nuxt server
   - Handle game logic, player management
   - **DO NOT DELETE THESE!**

2. **Self-Bot Client** (`discord-bot/selfbot.js`):
   - This is a **separate Node.js process**
   - Connects to Discord as a user account
   - Polls your API endpoints
   - Fetches Discord users and sends data back

### How They Work Together:

```
Narrator (Web UI) → API Endpoint → Bot State → Discord Self-Bot
                                                      ↓
Game Updated ← WebSocket Broadcast ← API Endpoint ← Fetches Discord Data
```

## 🚀 Heroku Deployment

### Step 1: Single Package.json

All dependencies are in the **root** `package.json`:

- Nuxt dependencies
- Discord bot dependencies (`discord.js-selfbot-v13`, `node-fetch`)
- MongoDB, auth, etc.

### Step 2: Environment Variables

Set these in Heroku Config Vars:

```bash
heroku config:set MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/loupgarou"
heroku config:set JWT_SECRET="your-super-secret-key"
heroku config:set NARRATEUR_KEY="narra000"
heroku config:set DISCORD_TOKEN="your_discord_token"
heroku config:set SERVER_URL="https://your-app.herokuapp.com"
```

### Step 3: Procfile Configuration

Your `Procfile` defines two processes:

```
web: node .output/server/index.mjs
bot: node discord-bot/selfbot.js
```

### Step 4: Enable Bot Process

By default, Heroku only runs the `web` process. To run the bot:

#### Option A: Upgrade to Hobby Dyno ($7/month)

```bash
heroku ps:scale bot=1
```

This runs the bot as a **separate worker process**.

#### Option B: Free Dyno Workaround

If you want to stay on free tier, you can't run two processes. Instead:

1. **Modify the bot to run in-process** with your Nuxt server
2. Or **run the bot on your local machine** pointing to Heroku URL
3. Or **skip Discord integration** and add players manually

### Recommended: Option A (Hobby Dyno)

For production, use separate processes:

```bash
# Scale web dyno
heroku ps:scale web=1

# Scale bot dyno
heroku ps:scale bot=1

# Check status
heroku ps
```

## 🔧 Local Development

### Step 1: Install Dependencies

```bash
npm install
```

This installs **everything** (Nuxt + Discord bot) from one package.json.

### Step 2: Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env`:

```env
MONGODB_URI=mongodb://localhost:27017/loup-garou
JWT_SECRET=dev-secret-key
NARRATEUR_KEY=narra000
DISCORD_TOKEN=your_discord_token_here  # Optional
SERVER_URL=http://localhost:3000
```

### Step 3: Run in Development

**Terminal 1 - Nuxt Server:**

```bash
npm run dev
```

**Terminal 2 - Discord Bot (optional):**

```bash
npm run dev:bot
```

The bot will connect to `http://localhost:3000` and poll for requests.

## 📡 Discord Bot Setup

See [discord-bot/README.md](discord-bot/README.md) for:

- How to get your Discord token
- Bot usage instructions
- Troubleshooting

**Short version:**

1. Get Discord token from DevTools
2. Add to `.env` as `DISCORD_TOKEN`
3. Run `npm run dev:bot` locally or `heroku ps:scale bot=1` on Heroku

## 🎮 Using Discord Integration

### In SETUP Phase:

1. **Bot Status**: Shows 🟢 if bot is online
2. **Voice Scan**: Enter Discord channel ID, click scan
3. **Manual Fetch**: Enter Discord user ID to add individual players
4. **Role Assignment**: Use dropdowns to assign roles from grimoire

### Without Discord Bot:

The game works perfectly fine without the Discord bot! Just:

- Use the **Manual** tab in setup
- Type player names
- Assign roles
- Start the game

## 🗂️ Database

### MongoDB Atlas (Recommended for Heroku)

1. Create free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Get connection string
3. Set `MONGODB_URI` in Heroku config vars

### Local MongoDB

```bash
# Install MongoDB locally
# Then run:
mongod --dbpath /path/to/data
```

Use `MONGODB_URI=mongodb://localhost:27017/loup-garou` in `.env`

## 🔒 Security Notes

### Discord Token Safety

Your `DISCORD_TOKEN` is **sensitive**:

- Never commit it to Git
- Never share it publicly
- Regenerate if exposed

### Production Checklist

Before deploying:

- [ ] Change `JWT_SECRET` to random string
- [ ] Use MongoDB Atlas (not local)
- [ ] Set strong `NARRATEUR_KEY`
- [ ] Add Discord token only if using bot
- [ ] Set correct `SERVER_URL` (your Heroku URL)

## 📝 Deployment Commands

```bash
# Login to Heroku
heroku login

# Create app
heroku create your-loupgarou-app

# Add MongoDB addon (optional, or use Atlas)
heroku addons:create mongocloud:free

# Set environment variables
heroku config:set JWT_SECRET="random-secret-here"
heroku config:set NARRATEUR_KEY="narra000"
heroku config:set DISCORD_TOKEN="your_token"
heroku config:set SERVER_URL="https://your-loupgarou-app.herokuapp.com"

# Deploy
git push heroku main

# Scale dynos
heroku ps:scale web=1 bot=1

# View logs
heroku logs --tail

# Check dyno status
heroku ps
```

## 🐛 Troubleshooting

### Bot Shows "Hors ligne" on Heroku

**Check:**

1. Bot dyno is running: `heroku ps`
2. Discord token is set: `heroku config:get DISCORD_TOKEN`
3. SERVER_URL matches your app: `heroku config:get SERVER_URL`
4. View bot logs: `heroku logs --tail --dyno=bot`

**Fix:**

```bash
# Restart bot dyno
heroku restart bot

# Scale bot if not running
heroku ps:scale bot=1
```

### Database Connection Errors

**Check MONGODB_URI:**

```bash
heroku config:get MONGODB_URI
```

Should look like:

```
mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

### Build Failures

**Common issues:**

- Node version: Ensure `engines` in package.json matches Heroku's Node
- Missing dependencies: Check `package.json` includes all needed packages
- Build logs: `heroku logs --tail` to see errors

### Bot Not Scanning

**Check:**

1. Bot is online (green indicator in UI)
2. Channel ID is correct (right-click channel → Copy ID in Discord)
3. Your Discord account is in that server
4. Channel is a voice channel

## 💰 Heroku Pricing

- **Free Dynos**: 1 web OR 1 bot (not both)
- **Hobby Dynos ($7/mo)**: Run both web + bot
- **Eco Plan ($5/mo)**: Shared dyno hours

**Recommendation**: Start with Hobby plan if using Discord bot.

## 📚 Additional Resources

- [Nuxt.js Docs](https://nuxt.com)
- [Heroku Node.js Guide](https://devcenter.heroku.com/articles/nodejs-support)
- [MongoDB Atlas Setup](https://www.mongodb.com/docs/atlas/getting-started/)

## 🆘 Support

Issues with:

- **Discord Bot**: See [discord-bot/README.md](discord-bot/README.md)
- **Game Logic**: Check server logs: `heroku logs --tail`
- **Database**: Verify MongoDB connection string

---

Built with 🌙 for your Loup-Garou games!
