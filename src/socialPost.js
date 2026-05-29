const PLATFORM_STYLES = {
  twitch: {
    label: "Twitch",
    color: "#9146FF",
    title: "frazyy is live",
    button: "Watch stream"
  },
  tiktok: {
    label: "TikTok",
    color: "#25F4EE",
    title: "new TikTok",
    button: "Open TikTok"
  },
  instagram: {
    label: "Instagram",
    color: "#E1306C",
    title: "new Instagram post",
    button: "Open Instagram"
  },
  twitter: {
    label: "X / Twitter",
    color: "#1D9BF0",
    title: "new post",
    button: "Open post"
  }
};

function cleanText(value, maxLength, fallback = "") {
  const text = String(value ?? fallback).trim();
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function isHttpUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function listSocialPlatforms() {
  return Object.entries(PLATFORM_STYLES).map(([id, platform]) => ({
    id,
    label: platform.label
  }));
}

export function buildSocialPostScript(input = {}, fallbackChannelId = "") {
  const platformId = cleanText(input.platform, 40, "twitter").toLowerCase();
  const platform = PLATFORM_STYLES[platformId] ?? PLATFORM_STYLES.twitter;
  const postUrl = cleanText(input.postUrl || input.url, 600);
  const caption = cleanText(input.caption, 1500, "new post just dropped");
  const channelId = cleanText(input.channelId, 64, fallbackChannelId);

  if (!isHttpUrl(postUrl)) {
    throw new Error("Post link must be a valid http or https URL.");
  }

  return {
    id: `social-${platformId}-${Date.now()}`,
    name: `${platform.label} post`,
    enabled: true,
    channelId,
    message: {
      content: caption,
      embeds: [
        {
          title: platform.title,
          description: postUrl,
          color: platform.color,
          thumbnail: "",
          image: "",
          footer: "frazbot",
          fields: []
        }
      ],
      buttons: [
        {
          label: platform.button,
          url: postUrl,
          emoji: ""
        }
      ]
    }
  };
}
