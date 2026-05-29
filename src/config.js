import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export function loadEnvFile(filePath = path.resolve(process.cwd(), ".env")) {
  if (!existsSync(filePath)) {
    return;
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) {
      continue;
    }

    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

export function getConfig() {
  loadEnvFile();

  const parsedPort = Number.parseInt(process.env.PORT ?? "3000", 10);
  const allowedUserIds = (process.env.DISCORD_ALLOWED_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return {
    adminKey: process.env.ADMIN_KEY ?? "",
    allowedUserIds,
    automationSecret: process.env.AUTOMATION_SECRET ?? "",
    clientId: process.env.DISCORD_CLIENT_ID ?? "",
    clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
    discordToken: process.env.DISCORD_TOKEN ?? "",
    guildId: process.env.DISCORD_GUILD_ID ?? "",
    port: Number.isFinite(parsedPort) ? parsedPort : 3000,
    publicUrl: process.env.PUBLIC_URL ?? "",
    publicDir: path.resolve(process.cwd(), "public"),
    socialPostChannelId: process.env.SOCIAL_POST_CHANNEL_ID ?? ""
  };
}
