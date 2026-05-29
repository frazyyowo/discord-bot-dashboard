import { promises as fs } from "node:fs";
import http from "node:http";
import path from "node:path";
import { createAuth } from "./auth.js";
import { buildSocialPostScript, listSocialPlatforms } from "./socialPost.js";
import { handleTwitchEventSub } from "./twitchEventSub.js";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8"
};

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(data));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    request.on("data", (chunk) => {
      chunks.push(chunk);
      if (Buffer.concat(chunks).length > 1_000_000) {
        reject(new Error("Request body is too large."));
      }
    });

    request.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("Request body must be valid JSON."));
      }
    });

    request.on("error", reject);
  });
}

function readRawBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    request.on("data", (chunk) => {
      chunks.push(chunk);
      if (Buffer.concat(chunks).length > 1_000_000) {
        reject(new Error("Request body is too large."));
      }
    });

    request.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });

    request.on("error", reject);
  });
}

async function serveStatic(request, response, url, config) {
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.resolve(config.publicDir, `.${pathname}`);
  const relative = path.relative(config.publicDir, filePath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(filePath)] ?? "application/octet-stream"
    });
    response.end(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    throw error;
  }
}

function requestAutomationSecret(request, url) {
  return request.headers["x-automation-secret"] ?? url.searchParams.get("secret") ?? "";
}

async function handleWebhook(request, response, url, { bot, config }) {
  if (url.pathname === "/webhooks/twitch/eventsub") {
    if (request.method !== "POST") {
      sendJson(response, 405, { error: "Method not allowed." });
      return true;
    }

    const rawBody = await readRawBody(request);
    await handleTwitchEventSub({ request, response, rawBody, bot, config });
    return true;
  }

  if (url.pathname !== "/webhooks/social") {
    return false;
  }

  if (!config.automationSecret) {
    sendJson(response, 503, { error: "AUTOMATION_SECRET is not configured." });
    return true;
  }

  if (requestAutomationSecret(request, url) !== config.automationSecret) {
    sendJson(response, 401, { error: "Wrong automation secret." });
    return true;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed." });
    return true;
  }

  const body = await readBody(request);
  const script = buildSocialPostScript(body, config.socialPostChannelId);
  const sent = await bot.sendScript(script, script.channelId);
  sendJson(response, 200, {
    ok: true,
    channelId: sent.channelId,
    messageId: sent.id,
    url: sent.url
  });
  return true;
}

function requireApiAuth(request, response, auth) {
  if (!auth.isConfigured()) {
    sendJson(response, 503, {
      error: "Discord login is not configured. Add DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET."
    });
    return null;
  }

  const session = auth.getSession(request);
  if (!session) {
    sendJson(response, 401, { error: "Login required.", loginUrl: "/login.html" });
    return null;
  }

  return session;
}

async function handleApi(request, response, url, { storage, bot, config, auth }) {
  const segments = url.pathname.split("/").filter(Boolean);
  const resource = segments[1];
  const id = segments[2];
  const action = segments[3];

  if (request.method === "GET" && resource === "health") {
    sendJson(response, 200, {
      ok: true,
      botReady: bot.isReady(),
      discordLoginConfigured: auth.isConfigured(),
      allowedUsersConfigured: config.allowedUserIds.length > 0
    });
    return;
  }

  const session = requireApiAuth(request, response, auth);
  if (!session) {
    return;
  }

  if (request.method === "GET" && resource === "me") {
    sendJson(response, 200, { user: session.user });
    return;
  }

  if (request.method === "GET" && resource === "social-platforms") {
    sendJson(response, 200, { platforms: listSocialPlatforms() });
    return;
  }

  if (request.method === "POST" && resource === "social-post") {
    const body = await readBody(request);
    const script = buildSocialPostScript(body, config.socialPostChannelId);
    const sent = await bot.sendScript(script, script.channelId);
    sendJson(response, 200, {
      ok: true,
      channelId: sent.channelId,
      messageId: sent.id,
      url: sent.url
    });
    return;
  }

  if (resource !== "scripts") {
    sendJson(response, 404, { error: "Unknown API route." });
    return;
  }

  if (request.method === "GET" && !id) {
    sendJson(response, 200, { scripts: await storage.listScripts() });
    return;
  }

  if (request.method === "GET" && id) {
    const script = await storage.getScript(id);
    if (!script) {
      sendJson(response, 404, { error: "Script not found." });
      return;
    }
    sendJson(response, 200, { script });
    return;
  }

  if (request.method === "POST" && !id) {
    const body = await readBody(request);
    const script = await storage.saveScript(body);
    sendJson(response, 201, { script });
    return;
  }

  if (request.method === "PUT" && id) {
    const body = await readBody(request);
    const script = await storage.saveScript({ ...body, id });
    sendJson(response, 200, { script });
    return;
  }

  if (request.method === "DELETE" && id) {
    const deleted = await storage.deleteScript(id);
    sendJson(response, deleted ? 200 : 404, deleted ? { ok: true } : { error: "Script not found." });
    return;
  }

  if (request.method === "POST" && id && action === "send") {
    const script = await storage.getScript(id);
    if (!script) {
      sendJson(response, 404, { error: "Script not found." });
      return;
    }

    const body = await readBody(request);
    const sent = await bot.sendScript(script, body.channelId || script.channelId);
    sendJson(response, 200, {
      ok: true,
      channelId: sent.channelId,
      messageId: sent.id,
      url: sent.url
    });
    return;
  }

  sendJson(response, 405, { error: "Method not allowed." });
}

export function createDashboardServer({ storage, bot, config }) {
  const auth = createAuth(config);
  const publicPaths = new Set(["/login.html", "/styles.css"]);

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);
      if (await auth.handleAuthRoute(request, response, url)) {
        return;
      }

      if (await handleWebhook(request, response, url, { bot, config })) {
        return;
      }

      if (url.pathname.startsWith("/api/")) {
        await handleApi(request, response, url, { storage, bot, config, auth });
        return;
      }

      if (!publicPaths.has(url.pathname) && !url.pathname.startsWith("/assets/")) {
        const session = auth.requireAuth(request, response);
        if (!session) {
          return;
        }
      } else if (url.pathname === "/login.html" && auth.getSession(request)) {
        response.writeHead(302, { Location: "/" });
        response.end();
        return;
      }

      await serveStatic(request, response, url, config);
    } catch (error) {
      console.error(error);
      sendJson(response, 500, { error: error.message });
    }
  });

  return {
    server,

    start() {
      return new Promise((resolve) => {
        server.listen(config.port, () => {
          console.log(`Dashboard running at http://localhost:${config.port}`);
          resolve(server);
        });
      });
    }
  };
}
