import { buildSocialPostScript } from "./socialPost.js";
import { setupTwitchEventSub } from "./twitchEventSub.js";

const YOUTUBE_FEED_URL = "https://www.youtube.com/feeds/videos.xml";
const POLL_INTERVAL_MS = 10 * 60 * 1000;

const DEFAULT_SETTINGS = {
  twitch: {
    enabled: false,
    channelLogin: "",
    discordChannelId: "",
    message: "@everyone {{channel}} is live\n{{url}}"
  },
  youtubeMain: {
    enabled: false,
    channelId: "",
    discordChannelId: "",
    message: "@everyone new video: {{title}}\n{{url}}",
    lastVideoId: ""
  },
  youtubeVods: {
    enabled: false,
    channelId: "",
    discordChannelId: "",
    message: "new vod: {{title}}\n{{url}}",
    lastVideoId: ""
  },
  tiktok: {
    enabled: false,
    discordChannelId: "",
    message: "new TikTok: {{title}}\n{{url}}"
  }
};

function text(value, maxLength, fallback = "") {
  const next = String(value ?? fallback).trim();
  return next.length > maxLength ? next.slice(0, maxLength) : next;
}

function mergeSetting(input = {}, defaults) {
  return {
    ...defaults,
    ...input,
    enabled: Boolean(input.enabled),
    channelId: text(input.channelId, 128, defaults.channelId),
    channelLogin: text(input.channelLogin, 80, defaults.channelLogin),
    discordChannelId: text(input.discordChannelId, 64, defaults.discordChannelId),
    lastVideoId: text(input.lastVideoId, 80, defaults.lastVideoId),
    message: text(input.message, 1500, defaults.message)
  };
}

function decodeXml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function firstMatch(value, pattern) {
  return decodeXml(value.match(pattern)?.[1]?.trim() ?? "");
}

function fillTemplate(template, data) {
  return String(template || "")
    .replaceAll("{{platform}}", data.platform ?? "")
    .replaceAll("{{title}}", data.title ?? "")
    .replaceAll("{{url}}", data.url ?? "")
    .replaceAll("{{channel}}", data.channel ?? "");
}

function platformFromKey(key) {
  if (key === "youtubeMain" || key === "youtubeVods") {
    return "youtube";
  }
  return key;
}

async function latestYouTubeVideo(channelId) {
  const url = new URL(YOUTUBE_FEED_URL);
  url.searchParams.set("channel_id", channelId);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`YouTube feed failed with ${response.status}.`);
  }

  const xml = await response.text();
  const entry = xml.match(/<entry>([\s\S]*?)<\/entry>/)?.[1];
  if (!entry) {
    return null;
  }

  return {
    id: firstMatch(entry, /<yt:videoId>([\s\S]*?)<\/yt:videoId>/),
    title: firstMatch(entry, /<title>([\s\S]*?)<\/title>/),
    url:
      firstMatch(entry, /<link[^>]*href="([^"]+)"/) ||
      `https://www.youtube.com/watch?v=${firstMatch(entry, /<yt:videoId>([\s\S]*?)<\/yt:videoId>/)}`,
    channel: firstMatch(entry, /<name>([\s\S]*?)<\/name>/)
  };
}

export function defaultAutoPosts() {
  return structuredClone(DEFAULT_SETTINGS);
}

export function normalizeAutoPosts(input = {}) {
  return {
    twitch: mergeSetting(input.twitch, DEFAULT_SETTINGS.twitch),
    youtubeMain: mergeSetting(input.youtubeMain, DEFAULT_SETTINGS.youtubeMain),
    youtubeVods: mergeSetting(input.youtubeVods, DEFAULT_SETTINGS.youtubeVods),
    tiktok: mergeSetting(input.tiktok, DEFAULT_SETTINGS.tiktok)
  };
}

export function buildAutoPostScript(key, post, settings, fallbackChannelId = "") {
  const setting = settings[key] ?? {};
  const platform = platformFromKey(key);
  const data = {
    platform,
    title: text(post.title, 300),
    url: text(post.url || post.postUrl, 600),
    channel: text(post.channel, 120)
  };
  const caption = fillTemplate(setting.message, data) || data.url;

  return buildSocialPostScript(
    {
      platform,
      postUrl: data.url,
      caption,
      channelId: setting.discordChannelId
    },
    fallbackChannelId
  );
}

function buildTwitchConfig(config, settings) {
  return {
    ...config,
    socialPostChannelId: settings.twitch.discordChannelId || config.socialPostChannelId,
    twitchChannelLogin: settings.twitch.channelLogin || config.twitchChannelLogin,
    twitchLiveMessage: settings.twitch.message || config.twitchLiveMessage
  };
}

export function createAutoPostManager({ storage, bot, config }) {
  let timer = null;

  async function getSettings() {
    return normalizeAutoPosts(await storage.getAutoPosts());
  }

  async function saveSettings(settings) {
    return storage.saveAutoPosts(settings);
  }

  async function setupTwitch(settings) {
    if (!settings.twitch.enabled) {
      return;
    }
    await setupTwitchEventSub(buildTwitchConfig(config, settings));
  }

  async function checkYouTubeKey(key, settings) {
    const setting = settings[key];
    if (!setting.enabled || !setting.channelId) {
      return;
    }

    const latest = await latestYouTubeVideo(setting.channelId);
    if (!latest?.id) {
      return;
    }

    if (!setting.lastVideoId) {
      settings[key].lastVideoId = latest.id;
      await saveSettings(settings);
      return;
    }

    if (setting.lastVideoId === latest.id) {
      return;
    }

    const script = buildAutoPostScript(key, latest, settings, config.socialPostChannelId);
    await bot.sendScript(script, script.channelId);
    settings[key].lastVideoId = latest.id;
    await saveSettings(settings);
  }

  async function checkYouTube() {
    try {
      const settings = await getSettings();
      await checkYouTubeKey("youtubeMain", settings);
      await checkYouTubeKey("youtubeVods", settings);
    } catch (error) {
      console.warn(`YouTube auto-post check failed: ${error.message}`);
    }
  }

  return {
    async getSettings() {
      return getSettings();
    },

    async saveSettings(input) {
      const settings = await saveSettings(normalizeAutoPosts(input));
      await setupTwitch(settings);
      await checkYouTube();
      return settings;
    },

    async start() {
      const settings = await getSettings();
      await setupTwitch(settings);
      await checkYouTube();
      timer = setInterval(checkYouTube, POLL_INTERVAL_MS);
    },

    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }
  };
}
