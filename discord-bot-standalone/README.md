# Discord Selfbot — Standalone Deployment

## Files
- `selfbot.js` — the bot
- `fix-lib.js` — auto-patches a library bug on `npm install`
- `Procfile` — Heroku worker process
- `.env.example` — all env vars with defaults

## Deploy to Heroku

```bash
# 1. Create a new Heroku app
heroku create your-bot-name

# 2. Set the stack to heroku-24 (Node 20+)
heroku stack:set heroku-24 -a your-bot-name

# 3. Set env vars (minimum required)
heroku config:set DISCORD_TOKEN=your_token -a your-bot-name
heroku config:set STALK_USER_ID=target_user_id -a your-bot-name

# 4. Set MongoDB URI (persistent settings across restarts)
heroku config:set MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname -a your-bot-name

# 5. Optional: connect to your dashboard
heroku config:set SERVER_URL=https://your-dashboard.herokuapp.com -a your-bot-name

# 6. Push this folder as a separate repo
cd discord-bot-standalone
git init
git add .
git commit -m "Initial deploy"
heroku git:remote -a your-bot-name
git push heroku main

# 7. Scale the worker dyno (no web dyno needed)
heroku ps:scale web=0 worker=1 -a your-bot-name
```

## After Deploy
- The `postinstall` script auto-patches the library bug
- **Settings persist forever** via MongoDB Atlas (set `MONGO_URI`)
- Without `MONGO_URI`, settings fall back to local file (resets on restart)
- Use `BOT_MODE=auto` with `DISCORD_TOKENS=token1,token2` for multi-account rotation

## Heroku Notes
- **Worker dyno only** — no web port needed
- With `MONGO_URI` set: settings & emoji pool survive dyno restarts
- Without `MONGO_URI`: settings reset on restart (Heroku ephemeral FS)
- Logs: `heroku logs --tail -a your-bot-name`
- Restart: `heroku ps:restart worker -a your-bot-name`

## Cost
- Eco dynos: $5/month (shared, sleeps after 30min idle — NOT good for bots)
- Basic dynos: $7/month (never sleeps — use this)
