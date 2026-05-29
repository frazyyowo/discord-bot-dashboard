import { randomBytes, timingSafeEqual } from "node:crypto";

const DISCORD_AUTHORIZE_URL = "https://discord.com/oauth2/authorize";
const DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token";
const DISCORD_ME_URL = "https://discord.com/api/users/@me";
const SESSION_COOKIE = "botstudio_session";
const STATE_COOKIE = "botstudio_oauth_state";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const STATE_TTL_MS = 10 * 60 * 1000;

function randomId(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

function parseCookies(request) {
  const header = request.headers.cookie ?? "";
  const cookies = new Map();

  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) {
      continue;
    }

    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) {
      cookies.set(key, decodeURIComponent(value));
    }
  }

  return cookies;
}

function sameString(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function cookieOptions({ httpOnly = true, maxAge = SESSION_TTL_MS, secure = false } = {}) {
  return [
    "Path=/",
    httpOnly ? "HttpOnly" : "",
    "SameSite=Lax",
    secure ? "Secure" : "",
    `Max-Age=${Math.floor(maxAge / 1000)}`
  ]
    .filter(Boolean)
    .join("; ");
}

function setCookie(response, name, value, options) {
  const next = `${name}=${encodeURIComponent(value)}; ${cookieOptions(options)}`;
  const existing = response.getHeader("Set-Cookie");

  if (!existing) {
    response.setHeader("Set-Cookie", next);
    return;
  }

  response.setHeader("Set-Cookie", Array.isArray(existing) ? [...existing, next] : [existing, next]);
}

function clearCookie(response, name, secure) {
  setCookie(response, name, "", { maxAge: 0, secure });
}

function sendHtml(response, statusCode, html) {
  response.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(html);
}

function redirect(response, location) {
  response.writeHead(302, { Location: location });
  response.end();
}

function getBaseUrl(request, config) {
  if (config.publicUrl) {
    return config.publicUrl.replace(/\/+$/, "");
  }

  const host = request.headers["x-forwarded-host"] ?? request.headers.host ?? `localhost:${config.port}`;
  const proto = request.headers["x-forwarded-proto"] ?? "http";
  return `${proto}://${host}`;
}

function isSecureRequest(request, config) {
  return config.publicUrl?.startsWith("https://") || request.headers["x-forwarded-proto"] === "https";
}

function forbiddenPage(user, allowedIds) {
  const ids = allowedIds.length > 0 ? allowedIds.join(", ") : "not configured";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Access denied</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body class="login-body">
    <main class="login-card">
      <div class="brand-mark">BS</div>
      <h1>Access denied</h1>
      <p>You logged in as ${user.username}, but this Discord user ID is not on the dashboard allow-list.</p>
      <p class="login-meta">Your ID: ${user.id}<br />Allowed IDs: ${ids}</p>
      <a class="login-button" href="/auth/logout">Try another account</a>
    </main>
  </body>
</html>`;
}

async function exchangeCodeForUser({ code, redirectUri, config }) {
  const tokenBody = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri
  });

  const tokenResponse = await fetch(DISCORD_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody
  });

  if (!tokenResponse.ok) {
    throw new Error(`Discord token exchange failed with ${tokenResponse.status}.`);
  }

  const token = await tokenResponse.json();
  const userResponse = await fetch(DISCORD_ME_URL, {
    headers: { Authorization: `${token.token_type} ${token.access_token}` }
  });

  if (!userResponse.ok) {
    throw new Error(`Discord user lookup failed with ${userResponse.status}.`);
  }

  return userResponse.json();
}

export function createAuth(config) {
  const sessions = new Map();
  const states = new Map();

  function cleanup() {
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (session.expiresAt <= now) {
        sessions.delete(id);
      }
    }
    for (const [id, state] of states) {
      if (state.expiresAt <= now) {
        states.delete(id);
      }
    }
  }

  function isConfigured() {
    return Boolean(config.clientId && config.clientSecret);
  }

  function getSession(request) {
    cleanup();
    const sessionId = parseCookies(request).get(SESSION_COOKIE);
    if (!sessionId) {
      return null;
    }

    const session = sessions.get(sessionId);
    if (!session || session.expiresAt <= Date.now()) {
      sessions.delete(sessionId);
      return null;
    }

    session.expiresAt = Date.now() + SESSION_TTL_MS;
    return session;
  }

  function isAllowed(user) {
    return config.allowedUserIds.length === 0 || config.allowedUserIds.includes(user.id);
  }

  function requireAuth(request, response) {
    if (!isConfigured()) {
      response.writeHead(302, { Location: "/login.html?setup=missing" });
      response.end();
      return null;
    }

    const session = getSession(request);
    if (!session) {
      response.writeHead(302, { Location: "/login.html" });
      response.end();
      return null;
    }

    return session;
  }

  async function handleAuthRoute(request, response, url) {
    const secure = isSecureRequest(request, config);

    if (url.pathname === "/auth/discord") {
      if (!isConfigured()) {
        redirect(response, "/login.html?setup=missing");
        return true;
      }

      cleanup();
      const state = randomId(24);
      const redirectUri = `${getBaseUrl(request, config)}/auth/discord/callback`;
      states.set(state, { expiresAt: Date.now() + STATE_TTL_MS });
      setCookie(response, STATE_COOKIE, state, { maxAge: STATE_TTL_MS, secure });

      const authorizeUrl = new URL(DISCORD_AUTHORIZE_URL);
      authorizeUrl.searchParams.set("client_id", config.clientId);
      authorizeUrl.searchParams.set("redirect_uri", redirectUri);
      authorizeUrl.searchParams.set("response_type", "code");
      authorizeUrl.searchParams.set("scope", "identify");
      authorizeUrl.searchParams.set("state", state);

      redirect(response, authorizeUrl.toString());
      return true;
    }

    if (url.pathname === "/auth/discord/callback") {
      const code = url.searchParams.get("code");
      const returnedState = url.searchParams.get("state");
      const cookieState = parseCookies(request).get(STATE_COOKIE);
      const savedState = returnedState ? states.get(returnedState) : null;

      clearCookie(response, STATE_COOKIE, secure);

      if (
        !code ||
        !returnedState ||
        !cookieState ||
        !savedState ||
        savedState.expiresAt <= Date.now() ||
        !sameString(returnedState, cookieState)
      ) {
        sendHtml(response, 400, "<h1>Discord login failed</h1><p>OAuth state did not match.</p>");
        return true;
      }

      states.delete(returnedState);
      const redirectUri = `${getBaseUrl(request, config)}/auth/discord/callback`;
      const user = await exchangeCodeForUser({ code, redirectUri, config });

      if (!isAllowed(user)) {
        sendHtml(response, 403, forbiddenPage(user, config.allowedUserIds));
        return true;
      }

      const sessionId = randomId();
      sessions.set(sessionId, {
        createdAt: Date.now(),
        expiresAt: Date.now() + SESSION_TTL_MS,
        user: {
          id: user.id,
          username: user.global_name || user.username,
          avatar: user.avatar
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=80`
            : null
        }
      });

      setCookie(response, SESSION_COOKIE, sessionId, { secure });
      redirect(response, "/");
      return true;
    }

    if (url.pathname === "/auth/logout") {
      const sessionId = parseCookies(request).get(SESSION_COOKIE);
      if (sessionId) {
        sessions.delete(sessionId);
      }
      clearCookie(response, SESSION_COOKIE, secure);
      redirect(response, "/login.html");
      return true;
    }

    return false;
  }

  return {
    getSession,
    handleAuthRoute,
    isConfigured,
    requireAuth
  };
}
