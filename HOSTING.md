# Free Hosting Guide

## What Can Use GitHub Pages

GitHub Pages is great for a public static website, like:

- Bot landing page
- Commands list
- Invite button
- Support links
- Status/info page

Do not put the private bot dashboard on GitHub Pages. The dashboard needs a server because Discord login uses `DISCORD_CLIENT_SECRET`, and your bot uses `DISCORD_TOKEN`. Those must never be exposed in browser code.

## Easiest Free Option: Render

Render can host Node.js web services on a free instance. This is the easiest way to test the dashboard on your domain.

Important limits:

- Free services can sleep after 15 minutes without inbound traffic.
- The bot may go offline while the service is asleep.
- Local files can reset after redeploys/restarts, so dashboard-saved scripts might not be permanent on the free plan.

Render is still the easiest free start. For a serious always-online bot, use a VPS or Oracle Cloud Always Free.

### Render Steps

1. Push this project to GitHub.

2. Go to Render and create a new Web Service from your GitHub repo.

3. Use these settings:

   ```text
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   Instance Type: Free
   ```

4. Add environment variables:

   ```env
   DISCORD_TOKEN=your_bot_token
   DISCORD_CLIENT_ID=your_application_id
   DISCORD_CLIENT_SECRET=your_oauth_client_secret
   DISCORD_GUILD_ID=your_server_id
   DISCORD_ALLOWED_USER_IDS=your_discord_user_id
   PUBLIC_URL=https://panel.yourdomain.com
   AUTOMATION_SECRET=make-this-long-and-random
   SOCIAL_POST_CHANNEL_ID=your_announcement_channel_id
   TWITCH_CLIENT_ID=your_twitch_app_client_id
   TWITCH_CLIENT_SECRET=your_twitch_app_client_secret
   TWITCH_CHANNEL_LOGIN=your_twitch_username
   TWITCH_EVENTSUB_SECRET=make-this-random-too
   TWITCH_LIVE_MESSAGE=@everyone live now
   ```

5. Add your custom domain in Render:

   ```text
   panel.yourdomain.com
   ```

6. In your domain DNS, add the record Render tells you to add. Usually it is a `CNAME`.

7. In Discord Developer Portal, add this OAuth2 redirect:

   ```text
   https://panel.yourdomain.com/auth/discord/callback
   ```

8. Redeploy on Render.

9. Open:

   ```text
   https://panel.yourdomain.com
   ```

## Best Free Always-On Option: Oracle Cloud Always Free

If you want the bot online 24/7 without sleeping, Oracle Cloud Always Free is better, but setup is harder.

Basic plan:

1. Create an Oracle Cloud Free Tier account.
2. Create an Always Free Ubuntu VM.
3. Point `panel.yourdomain.com` to the VM public IP with an `A` record.
4. SSH into the VM.
5. Install Node.js 20, Git, and Caddy.
6. Clone your GitHub repo.
7. Create `.env` on the server.
8. Run `npm install` and `npm run deploy`.
9. Run the bot with PM2 or a systemd service.
10. Use Caddy to proxy HTTPS to `localhost:3000`.

Caddy config:

```text
panel.yourdomain.com {
  reverse_proxy localhost:3000
}
```

Discord redirect:

```text
https://panel.yourdomain.com/auth/discord/callback
```

## My Recommendation

Use Render first because it is simple with GitHub.

When the bot is ready and you care about it being online all the time, move it to Oracle Cloud Always Free or a cheap VPS.
