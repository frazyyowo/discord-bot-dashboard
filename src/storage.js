import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const DATA_DIR = path.resolve(process.cwd(), "data");
const SCRIPTS_DIR = path.join(DATA_DIR, "scripts");
const AUTO_POSTS_FILE = path.join(DATA_DIR, "auto-posts.json");

function text(value, maxLength, fallback = "") {
  const next = String(value ?? fallback).trim();
  return next.length > maxLength ? next.slice(0, maxLength) : next;
}

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function isUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeFields(fields = []) {
  if (!Array.isArray(fields)) {
    return [];
  }

  return fields
    .map((field) => ({
      name: text(field.name, 256),
      value: text(field.value, 1024),
      inline: Boolean(field.inline)
    }))
    .filter((field) => field.name && field.value)
    .slice(0, 25);
}

function normalizeButtons(buttons = []) {
  if (!Array.isArray(buttons)) {
    return [];
  }

  return buttons
    .map((button) => ({
      label: text(button.label, 80),
      url: text(button.url, 512),
      emoji: text(button.emoji, 64)
    }))
    .filter((button) => button.label && isUrl(button.url))
    .slice(0, 25);
}

function normalizeEmbed(embed = {}) {
  const fields = normalizeFields(embed.fields);
  const normalized = {
    title: text(embed.title, 256),
    description: text(embed.description, 4096),
    color: text(embed.color, 16, "#5865F2"),
    thumbnail: text(embed.thumbnail, 512),
    image: text(embed.image, 512),
    footer: text(embed.footer, 2048),
    fields
  };

  const hasContent =
    normalized.title ||
    normalized.description ||
    normalized.thumbnail ||
    normalized.image ||
    normalized.footer ||
    normalized.fields.length > 0;

  return hasContent ? normalized : null;
}

function normalizeScript(input = {}, existing = {}) {
  const now = new Date().toISOString();
  const existingMessage = existing.message ?? {};
  const inputMessage = input.message ?? {};
  const inputEmbeds = Array.isArray(inputMessage.embeds) ? inputMessage.embeds : [];
  const existingEmbeds = Array.isArray(existingMessage.embeds) ? existingMessage.embeds : [];
  const embed = normalizeEmbed(inputEmbeds[0] ?? existingEmbeds[0] ?? {});
  const id = slugify(input.id || existing.id || input.name) || `script-${randomUUID().slice(0, 8)}`;

  return {
    id,
    name: text(input.name, 80, existing.name || id),
    description: text(input.description, 240, existing.description),
    enabled: input.enabled ?? existing.enabled ?? true,
    channelId: text(input.channelId, 64, existing.channelId),
    message: {
      content: text(inputMessage.content, 2000, existingMessage.content),
      embeds: embed ? [embed] : [],
      buttons: normalizeButtons(inputMessage.buttons ?? existingMessage.buttons)
    },
    createdAt: existing.createdAt ?? now,
    updatedAt: now
  };
}

function scriptPath(id) {
  const safeId = slugify(id);
  if (!safeId) {
    throw new Error("Script id is required.");
  }
  return path.join(SCRIPTS_DIR, `${safeId}.json`);
}

async function readJsonFile(filePath) {
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content);
}

export function createStorage() {
  return {
    async ensureStorage() {
      await fs.mkdir(SCRIPTS_DIR, { recursive: true });
    },

    async getAutoPosts() {
      await this.ensureStorage();
      try {
        return await readJsonFile(AUTO_POSTS_FILE);
      } catch (error) {
        if (error.code === "ENOENT") {
          return {};
        }
        throw error;
      }
    },

    async saveAutoPosts(settings) {
      await this.ensureStorage();
      await fs.writeFile(AUTO_POSTS_FILE, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
      return settings;
    },

    async listScripts() {
      await this.ensureStorage();
      const entries = await fs.readdir(SCRIPTS_DIR, { withFileTypes: true });
      const scripts = [];

      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith(".json")) {
          continue;
        }

        try {
          const script = await readJsonFile(path.join(SCRIPTS_DIR, entry.name));
          scripts.push(script);
        } catch (error) {
          console.warn(`Skipping broken script file ${entry.name}: ${error.message}`);
        }
      }

      return scripts.sort((left, right) => left.name.localeCompare(right.name));
    },

    async getScript(id) {
      await this.ensureStorage();
      try {
        return await readJsonFile(scriptPath(id));
      } catch (error) {
        if (error.code === "ENOENT") {
          return null;
        }
        throw error;
      }
    },

    async saveScript(input) {
      await this.ensureStorage();
      const existing = input.id ? await this.getScript(input.id) : null;
      const script = normalizeScript(input, existing ?? {});
      await fs.writeFile(scriptPath(script.id), `${JSON.stringify(script, null, 2)}\n`, "utf8");
      return script;
    },

    async deleteScript(id) {
      await this.ensureStorage();
      try {
        await fs.unlink(scriptPath(id));
        return true;
      } catch (error) {
        if (error.code === "ENOENT") {
          return false;
        }
        throw error;
      }
    }
  };
}
