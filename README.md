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
- Auto post settings for Twitch, TikTok, YouTube, and YouTube VODs
- Secret webhook endpoint for external automation tools
- Twitch EventSub auto-post when your stream goes live

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
   TWITCH_CLIENT_ID=your_twitch_app_client_id
   TWITCH_CLIENT_SECRET=your_twitch_app_client_secret
   TWITCH_CHANNEL_LOGIN=your_twitch_username
   TWITCH_EVENTSUB_SECRET=make-this-random-too
   TWITCH_LIVE_MESSAGE=@everyone live now
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
    "imageUrl": "https://example.com/image.png",
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

## Private Button Replies

Buttons can either open a link or privately reply to the person who clicked.

The main message can also send a normal image without using an embed. Paste an image link into `Message image URL`.

In the website, use `Add button`.

For a private reply button, set `Type` to `Private reply` and set `Target` to a short ID like `rules`.

For a link button, set `Type` to `Link` and set `Target` to the full URL.

Then use `Add reply` to make the private reply. Its `Reply ID` must match the button target, like `rules`.

You can make any IDs you want, like `faq`, `modmail`, `links`, or `server-info`.

Private replies can also have a normal image URL, separate from embeds.

You can also add embeds. For the main message, click `Add embed` and fill the normal boxes. You can add multiple extra embeds without typing any weird divider format.

For private reply embeds, click `Add embed` under `Private reply embeds`. Set `Reply ID` to the same ID as the private reply, then fill the title, description, color, image, and footer.

## Mention Replies

The `Mention replies` panel controls what frazbot says when someone mentions the bot.

Default random messages are one per line:

```text
meow :3
mrrp :3
haiii :3
```

Member custom replies use Discord user IDs:

```text
123456789012345678 | hii bestie / meowww :3 / omg hello
987654321098765432 | yo / hello there / beep
```

If a user has custom replies, frazbot randomly picks from their messages. Everyone else gets the default random messages.

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

## Automatic Posts

The dashboard has an `auto posts` settings panel. It saves custom message templates for:

- Twitch
- YouTube
- YouTube VODs
- TikTok

Template words:

```text
{{title}}
{{url}}
{{channel}}
{{platform}}
```

For real automatic posting, a platform must send frazbot a webhook/event when something happens.

### Twitch Auto Live Posts

Twitch works directly with EventSub.

In Render, keep these Twitch secrets set:

```env
TWITCH_CLIENT_ID=your_twitch_app_client_id
TWITCH_CLIENT_SECRET=your_twitch_app_client_secret
TWITCH_EVENTSUB_SECRET=make-this-random-too
```

Then use the website `auto posts` panel to set your Twitch login, Discord channel ID, and live message.

On startup, frazbot creates a Twitch `stream.online` EventSub subscription. When the Twitch channel goes live, Twitch calls:

```text
https://your-domain.com/webhooks/twitch/eventsub
```

and frazbot posts in Discord.

### YouTube Main And YouTube VODs

YouTube is automatic through the public channel feed. In the website, put each YouTube channel ID into the matching auto-post card:

- Main channel goes in `YouTube`
- VODs channel goes in `YouTube VODs`

frazbot checks for new videos every 10 minutes while it is awake.

### TikTok

TikTok does not give normal accounts a simple public feed like YouTube. The auto-post card is still there for the message template, but TikTok needs a webhook trigger from TikTok developer webhooks or a tool like Make/Zapier/IFTTT.

Use this endpoint:

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

This endpoint is meant for TikTok webhooks, Make, Zapier, IFTTT, or your own scripts.

Official docs:

- Twitch EventSub: https://dev.twitch.tv/docs/eventsub/
- TikTok webhooks: https://developers.tiktok.com/doc/webhooks-overview
- X Account Activity API: https://docs.x.com/x-api/account-activity/introduction

## Official References

- Discord OAuth2: https://docs.discord.com/developers/platform/oauth2-and-permissions
- Discord user resource: https://docs.discord.com/developers/resources/user
- Discord bots: https://discord.com/developers/docs/bots
- Discord slash commands: https://docs.discord.com/developers/docs/interactions/slash-commands
- discord.js docs: https://discord.js.org/docs
