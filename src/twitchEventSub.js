import { createHmac, timingSafeEqual } from "node:crypto";
import { buildSocialPostScript } from "./socialPost.js";

const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const TWITCH_USERS_URL = "https://api.twitch.tv/helix/users";
const TWITCH_EVENTSUB_URL = "https://api.twitch.tv/helix/eventsub/subscriptions";

function text(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function twitchConfigured(config) {
  return Boolean(
    config.publicUrl &&
      config.twitchClientId &&
      config.twitchClientSecret &&
      config.twitchChannelLogin &&
      config.twitchEventSubSecret
  );
}

function hmac(secret, messageId, timestamp, rawBody) {
  return `sha256=${createHmac("sha256", secret)
    .update(`${messageId}${timestamp}${rawBody}`)
    .digest("hex")}`;
}

function secureEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyTwitchSignature(request, rawBody, secret) {
  const messageId = request.headers["twitch-eventsub-message-id"];
  const timestamp = request.headers["twitch-eventsub-message-timestamp"];
  const signature = request.headers["twitch-eventsub-message-signature"];

  if (!messageId || !timestamp || !signature) {
    return false;
  }

  return secureEqual(signature, hmac(secret, messageId, timestamp, rawBody));
}

function fillTemplate(template, data) {
  return String(template || "")
    .replaceAll("{{platform}}", data.platform ?? "")
    .replaceAll("{{title}}", data.title ?? "")
    .replaceAll("{{url}}", data.url ?? "")
    .replaceAll("{{channel}}", data.channel ?? "");
}

async function getAppAccessToken(config) {
  const body = new URLSearchParams({
    client_id: config.twitchClientId,
    client_secret: config.twitchClientSecret,
    grant_type: "client_credentials"
  });

  const response = await fetch(TWITCH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    throw new Error(`Twitch token request failed with ${response.status}.`);
  }

  const token = await response.json();
  return token.access_token;
}

async function getBroadcasterId(config, accessToken) {
  const url = new URL(TWITCH_USERS_URL);
  url.searchParams.set("login", config.twitchChannelLogin);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Client-Id": config.twitchClientId
    }
  });

  if (!response.ok) {
    throw new Error(`Twitch user lookup failed with ${response.status}.`);
  }

  const result = await response.json();
  const user = result.data?.[0];
  if (!user?.id) {
    throw new Error(`Twitch user "${config.twitchChannelLogin}" was not found.`);
  }

  return user.id;
}

async function createStreamOnlineSubscription(config, accessToken, broadcasterId) {
  const callback = `${config.publicUrl.replace(/\/+$/, "")}/webhooks/twitch/eventsub`;
  const body = {
    type: "stream.online",
    version: "1",
    condition: {
      broadcaster_user_id: broadcasterId
    },
    transport: {
      method: "webhook",
      callback,
      secret: config.twitchEventSubSecret
    }
  };

  const response = await fetch(TWITCH_EVENTSUB_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Client-Id": config.twitchClientId,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (response.status === 409) {
    console.log("Twitch stream.online subscription already exists.");
    return;
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Twitch EventSub subscribe failed with ${response.status}: ${message}`);
  }

  console.log(`Twitch stream.online subscription created for ${config.twitchChannelLogin}.`);
}

export async function setupTwitchEventSub(config) {
  if (!twitchConfigured(config)) {
    console.log("Twitch auto-post is not configured.");
    return;
  }

  if (!config.publicUrl.startsWith("https://")) {
    console.warn("Twitch EventSub needs PUBLIC_URL to be https.");
    return;
  }

  try {
    const accessToken = await getAppAccessToken(config);
    const broadcasterId = await getBroadcasterId(config, accessToken);
    await createStreamOnlineSubscription(config, accessToken, broadcasterId);
  } catch (error) {
    console.warn(`Twitch auto-post setup failed: ${error.message}`);
  }
}

export async function handleTwitchEventSub({ request, response, rawBody, bot, config }) {
  if (!config.twitchEventSubSecret) {
    response.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Twitch EventSub is not configured.");
    return;
  }

  if (!verifyTwitchSignature(request, rawBody, config.twitchEventSubSecret)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Invalid Twitch signature.");
    return;
  }

  const body = JSON.parse(rawBody);
  const messageType = request.headers["twitch-eventsub-message-type"];

  if (messageType === "webhook_callback_verification") {
    response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(body.challenge);
    return;
  }

  if (messageType === "revocation") {
    console.warn(`Twitch EventSub revoked: ${body.subscription?.status ?? "unknown"}`);
    response.writeHead(204);
    response.end();
    return;
  }

  if (messageType === "notification" && body.subscription?.type === "stream.online") {
    const channel = text(body.event?.broadcaster_user_login || config.twitchChannelLogin, 80);
    const postUrl = `https://twitch.tv/${channel}`;
    const caption =
      fillTemplate(text(config.twitchLiveMessage, 1500), {
        platform: "twitch",
        title: "live",
        url: postUrl,
        channel
      }) || `@everyone ${channel} is live`;
    const script = buildSocialPostScript(
      {
        platform: "twitch",
        postUrl,
        caption,
        channelId: config.socialPostChannelId
      },
      config.socialPostChannelId
    );

    await bot.sendScript(script, script.channelId);
  }

  response.writeHead(204);
  response.end();
}
