# frazbot

Custom Discord bot plus a private web dashboard.

## What You Built

- Discord bot powered by `discord.js`
- Slash command: `/script list` and `/script send`
- Web dashboard at `http://localhost:3000`
- Discord login for the dashboard
- Discord user ID allow-list
- Script files stored in `data/scripts/*.json`
- Rules panel in `data/scripts/rules.json`
- Social post maker for Twitch, TikTok, Instagram, and X/Twitter links
- Secret webhook endpoint for external automation tools

## Setup

1. Install Node.js 20 or newer.

2. Install packages:

   ```bash
   npm install
   ```

3. Create a Discord app:

   - Go to the Discord Developer Portal.
   - Create a new application.
   - Open the Bot page.
   - Create/reset the bot token.
   - Copy the token.
   - Copy the Application ID from General Information.
   - Copy the Client Secret from OAuth2.

4. Add OAuth2 redirects in the Discord Developer Portal:

   ```text
   http://localhost:3000/auth/discord/callback
   https://panel.yourdomain.com/auth/discord/callback
   ```

   Replace `panel.yourdomain.com` with your real dashboard domain.

5. Make your `.env` file:

   ```bash
   copy .env.example .env
   ```

   Fill it in:

   ```env
   DISCORD_TOKEN=your_bot_token_here
   DISCORD_CLIENT_ID=your_application_id_here
   DISCORD_CLIENT_SECRET=your_oauth_client_secret_here
   DISCORD_GUILD_ID=your_test_server_id_here
   DISCORD_ALLOWED_USER_IDS=your_discord_user_id_here
   PUBLIC_URL=http://localhost:3000
   AUTOMATION_SECRET=make-this-long-and-random
   SOCIAL_POST_CHANNEL_ID=your_announcement_channel_id
   PORT=3000
   ```

   For your real domain later:

   ```env
   PUBLIC_URL=https://panel.yourdomain.com
   ```

6. Invite the bot:

   In the Developer Portal, use OAuth2 URL Generator with:

   - Scopes: `bot`, `applications.commands`
   - Bot permissions: Send Messages, Embed Links, Use External Emojis, Read Message History

7. Deploy slash commands:

   ```bash
   npm run deploy
   ```

8. Start everything:

   ```bash
   npm start
   ```

9. Open:

   ```text
   http://localhost:3000
   ```

10. Log in with Discord, edit a script, set a channel ID, then press Save or Send.

## Connect Your Domain

A domain only points people somewhere. Your bot dashboard still needs to run on a server.

For the full free-hosting walkthrough, see `HOSTING.md`.

Simple path:

1. Pick a subdomain:

   ```text
   panel.yourdomain.com
   ```

2. Host this Node app somewhere:

   - VPS: Hetzner, DigitalOcean, Linode, Oracle, etc.
   - App host: Railway, Render, Fly.io, etc.
   - Home server is possible, but harder because of ports, HTTPS, and uptime.

3. Point DNS:

   - VPS: create an `A` record from `panel` to your server IP.
   - App host: create the `CNAME` they give you.

4. Add HTTPS:

   If using a VPS, Caddy is the easiest reverse proxy:

   ```text
   panel.yourdomain.com {
     reverse_proxy localhost:3000
   }
   ```

   Caddy will handle HTTPS certificates automatically.

5. In `.env` on the server:

   ```env
   PUBLIC_URL=https://panel.yourdomain.com
   PORT=3000
   ```

6. In Discord Developer Portal, add this exact redirect:

   ```text
   https://panel.yourdomain.com/auth/discord/callback
   ```

If the redirect URL in Discord and `PUBLIC_URL` do not match exactly, Discord login will fail.

## Lock It To Only You

Put your Discord user ID in:

```env
DISCORD_ALLOWED_USER_IDS=123456789012345678
```

For multiple admins:

```env
DISCORD_ALLOWED_USER_IDS=123456789012345678,987654321098765432
```

If this is empty, any Discord account can log in, so set it before putting the dashboard on your domain.

## How To Get A Channel ID

In Discord:

1. User Settings
2. Advanced
3. Enable Developer Mode
4. Right-click a channel
5. Copy Channel ID

Paste that ID into the dashboard.

## Script Format

A script is JSON, but you normally edit it from the website:

```json
{
  "id": "rules",
  "name": "Rules Welcome Panel",
  "channelId": "123456789012345678",
  "message": {
    "content": "Welcome to the server",
    "embeds": [
      {
        "title": "Start Here",
        "description": "Read rules, claim roles, and find navigation.",
        "color": "#57F287",
        "image": "",
        "footer": "Server guide"
      }
    ],
    "buttons": [
      {
        "label": "Server Rules",
        "url": "https://discord.com",
        "emoji": ""
      }
    ]
  }
}
```

## Making It Mega Custom

Good next modules:

- Welcome message when a member joins
- Reaction or button role menus
- Ticket/modmail system
- Auto moderation logs
- Giveaway system
- Music/status feed
- Automatic Twitch/Instagram/TikTok/X announcements
- Website login with Discord OAuth2
- Per-server settings if the bot joins many servers

Keep the dashboard "scripts" as safe templates. Do not let random website text run as JavaScript inside your bot process. If you want custom code modules later, add them as trusted files in `src/modules`, review them, then restart the bot.

## Social Post Maker

The dashboard has a post maker for Twitch, TikTok, Instagram, and X/Twitter. Paste a post link, write the caption, set the channel ID, and send it.

There is also an automation endpoint:

```text
POST https://your-domain.com/webhooks/social
```

Headers:

```text
X-Automation-Secret: your AUTOMATION_SECRET value
```

JSON body:

```json
{
  "platform": "twitch",
  "postUrl": "https://twitch.tv/yourchannel",
  "caption": "@everyone live now",
  "channelId": "123456789012345678"
}
```

This endpoint is meant for Make, Zapier, IFTTT, Twitch EventSub, TikTok webhooks, or your own scripts.

## Official References

- Discord OAuth2: https://docs.discord.com/developers/platform/oauth2-and-permissions
- Discord user resource: https://docs.discord.com/developers/resources/user
- Discord bots: https://discord.com/developers/docs/bots
- Discord slash commands: https://docs.discord.com/developers/docs/interactions/slash-commands
- discord.js docs: https://discord.js.org/docs
