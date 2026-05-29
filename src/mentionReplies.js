const DEFAULT_SETTINGS = {
  enabled: true,
  defaultMessages: ["meow :3", "mrrp :3", "haiii :3"],
  users: []
};

function text(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function messagesFrom(value) {
  const messages = Array.isArray(value) ? value : String(value ?? "").split(/\r?\n/);
  return messages.map((message) => text(message, 300)).filter(Boolean).slice(0, 25);
}

function normalizeUser(input = {}) {
  return {
    userId: text(input.userId, 64),
    messages: messagesFrom(input.messages)
  };
}

export function defaultMentionReplies() {
  return structuredClone(DEFAULT_SETTINGS);
}

export function normalizeMentionReplies(input = {}) {
  const defaults = defaultMentionReplies();
  const users = Array.isArray(input.users) ? input.users : [];

  return {
    enabled: input.enabled ?? defaults.enabled,
    defaultMessages: messagesFrom(input.defaultMessages).length
      ? messagesFrom(input.defaultMessages)
      : defaults.defaultMessages,
    users: users
      .map(normalizeUser)
      .filter((user) => user.userId && user.messages.length > 0)
      .slice(0, 50)
  };
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function pickMentionReply(settings, userId) {
  const normalized = normalizeMentionReplies(settings);
  if (!normalized.enabled) {
    return null;
  }

  const user = normalized.users.find((item) => item.userId === userId);
  const messages = user?.messages.length ? user.messages : normalized.defaultMessages;
  return messages.length ? randomItem(messages) : null;
}
