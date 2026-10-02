# Discord Quest Bot

A Discord bot that automatically completes Discord Quests for users.

## Setup on Railway

1. Fork/clone this repo to your GitHub
2. Go to [railway.app](https://railway.app) and create a new project
3. Select **"Deploy from GitHub repo"** and choose this repo
4. Add environment variables in Railway dashboard:
   - `BOT_TOKEN` — Your Discord Bot Token
   - `CLIENT_ID` — Your Discord Application/Client ID
5. Deploy! Railway will redeploy when new commits reach the connected `main` branch.

## Automatic Railway redeploys

The `.github/workflows/railway-deploy.yml` workflow runs after every push to
`main`. To enable it with a Railway deploy hook:

1. In Railway, open the service settings and create a **Deploy Hook**.
2. In GitHub, open **Settings → Secrets and variables → Actions**.
3. Create a repository secret named `RAILWAY_DEPLOY_HOOK_URL` and paste the
   deploy hook URL there.

The workflow skips safely until that secret exists. If Railway is already
connected directly to this repository, Railway's native GitHub integration is
enough and this hook is optional.

The separate validation workflow checks TypeScript on every push. It does not
start a long-running bot process inside GitHub Actions.

## Bot Commands

- `/quest-help` — open the command and safety guide
- `/quest-ping` — check whether the bot is online
- `/run-quests` — Auto-complete your Discord quests (requires your user token)
- `/quest-status` — Check your active quests and progress
- `/quest-config` — Show the configured quest channel (Manage Server required)
- `/reset channel` — Clear the channel setting and disable quest commands (Manage Server required)
- `/quest-notify on|off` — Enable or disable new quest announcement DMs
- `/quest-announce <quest> [details]` — Admin sends an English quest announcement to bot users
- `!quest` — Show the Quest Control Center
- `!quest help` — Show the help guide

## Set the quest channel

Run `/set channel` in the text channel you want to use, or choose a channel
with the `target` option. This command requires **Manage Server** permission.
The setting is saved separately for each server. Prefix commands, quest slash
commands, and the control panel buttons work only in that selected channel.
Use `/quest-config` to view the setting privately, or `/reset channel` to clear
it. Clearing the setting disables quest commands until an admin sets a channel
again.

Channel settings are stored in `.data/quest-channels.json` so they survive bot
process restarts. Keep that data directory available if you move the bot to a
different machine.

## New quest announcements

When a member uses a quest command in the configured channel, the bot records
their Discord user ID for this server (it never stores their user token).
Members can run `/quest-notify off` to opt out, or `/quest-notify on` to opt in
again. Admins can use `/quest-announce` with a quest name and optional details
to send an English embed DM to registered recipients. DMs can fail when a user
does not accept messages from the bot. Recipient tracking begins after this
feature is installed; the bot has no history of earlier users.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `BOT_TOKEN` | ✅ | Discord Bot Token (from Discord Developer Portal) |
| `CLIENT_ID` | ✅ | Discord Application Client ID |

## Getting BOT_TOKEN and CLIENT_ID

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application → "Bot" section → copy the token
3. Copy the Application ID from the General Information page

> Warning: this project currently uses user tokens for quest completion. That
> can put an account at risk and may violate Discord's Terms of Service.
