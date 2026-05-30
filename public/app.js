const state = {
  autoPosts: null,
  currentId: null,
  mentionReplies: null,
  scripts: [],
  user: null
};

const AUTO_POSTS_DRAFT_KEY = "frazbot:autoPostsDraft:v1";
const EDITOR_DRAFT_KEY = "frazbot:editorDraft:v1";
const MENTION_REPLIES_DRAFT_KEY = "frazbot:mentionRepliesDraft:v1";

const elements = {
  addExtraEmbedButton: document.querySelector("#addExtraEmbedButton"),
  addButtonCardButton: document.querySelector("#addButtonCardButton"),
  addPrivateReplyButton: document.querySelector("#addPrivateReplyButton"),
  addReplyEmbedButton: document.querySelector("#addReplyEmbedButton"),
  autoPostsForm: document.querySelector("#autoPostsForm"),
  autoPostsToast: document.querySelector("#autoPostsToast"),
  autoPostsButton: document.querySelector("#autoPostsButton"),
  autoTiktokDiscordChannel: document.querySelector("#autoTiktokDiscordChannel"),
  autoTiktokEnabled: document.querySelector("#autoTiktokEnabled"),
  autoTiktokMessage: document.querySelector("#autoTiktokMessage"),
  autoTwitchDiscordChannel: document.querySelector("#autoTwitchDiscordChannel"),
  autoTwitchEnabled: document.querySelector("#autoTwitchEnabled"),
  autoTwitchLogin: document.querySelector("#autoTwitchLogin"),
  autoTwitchMessage: document.querySelector("#autoTwitchMessage"),
  autoYoutubeMainChannel: document.querySelector("#autoYoutubeMainChannel"),
  autoYoutubeMainDiscordChannel: document.querySelector("#autoYoutubeMainDiscordChannel"),
  autoYoutubeMainEnabled: document.querySelector("#autoYoutubeMainEnabled"),
  autoYoutubeMainMessage: document.querySelector("#autoYoutubeMainMessage"),
  autoYoutubeVodsChannel: document.querySelector("#autoYoutubeVodsChannel"),
  autoYoutubeVodsDiscordChannel: document.querySelector("#autoYoutubeVodsDiscordChannel"),
  autoYoutubeVodsEnabled: document.querySelector("#autoYoutubeVodsEnabled"),
  autoYoutubeVodsMessage: document.querySelector("#autoYoutubeVodsMessage"),
  botStatus: document.querySelector("#botStatus"),
  buttonsList: document.querySelector("#buttonsList"),
  channelId: document.querySelector("#channelId"),
  closeAutoPostsButton: document.querySelector("#closeAutoPostsButton"),
  closeMentionRepliesButton: document.querySelector("#closeMentionRepliesButton"),
  deleteButton: document.querySelector("#deleteButton"),
  editorForm: document.querySelector("#editorForm"),
  embedColor: document.querySelector("#embedColor"),
  embedDescription: document.querySelector("#embedDescription"),
  embedFooter: document.querySelector("#embedFooter"),
  embedImage: document.querySelector("#embedImage"),
  embedPreview: document.querySelector("#embedPreview"),
  embedThumbnail: document.querySelector("#embedThumbnail"),
  embedTitle: document.querySelector("#embedTitle"),
  extraEmbedsList: document.querySelector("#extraEmbedsList"),
  messageContent: document.querySelector("#messageContent"),
  messageImage: document.querySelector("#messageImage"),
  mentionDefaultMessages: document.querySelector("#mentionDefaultMessages"),
  mentionRepliesButton: document.querySelector("#mentionRepliesButton"),
  mentionRepliesEnabled: document.querySelector("#mentionRepliesEnabled"),
  mentionRepliesForm: document.querySelector("#mentionRepliesForm"),
  mentionRepliesToast: document.querySelector("#mentionRepliesToast"),
  mentionUserReplies: document.querySelector("#mentionUserReplies"),
  newScriptButton: document.querySelector("#newScriptButton"),
  previewButtons: document.querySelector("#previewButtons"),
  previewContent: document.querySelector("#previewContent"),
  previewEmbedDescription: document.querySelector("#previewEmbedDescription"),
  previewEmbedFooter: document.querySelector("#previewEmbedFooter"),
  previewEmbedImage: document.querySelector("#previewEmbedImage"),
  previewEmbedTitle: document.querySelector("#previewEmbedTitle"),
  previewMessageImage: document.querySelector("#previewMessageImage"),
  saveButton: document.querySelector("#saveButton"),
  scriptDescription: document.querySelector("#scriptDescription"),
  scriptList: document.querySelector("#scriptList"),
  scriptName: document.querySelector("#scriptName"),
  privateRepliesList: document.querySelector("#privateRepliesList"),
  replyEmbedsList: document.querySelector("#replyEmbedsList"),
  selectedScriptId: document.querySelector("#selectedScriptId"),
  sendButton: document.querySelector("#sendButton"),
  templateButton: document.querySelector("#templateButton"),
  toast: document.querySelector("#toast"),
  userAvatar: document.querySelector("#userAvatar"),
  userName: document.querySelector("#userName")
};

const blankScript = () => ({
  id: "",
  name: "new panel",
  description: "",
  enabled: true,
  channelId: "",
  message: {
    content: "",
    imageUrl: "",
    embeds: [
      {
        title: "",
        description: "",
        color: "#5865f2",
        thumbnail: "",
        image: "",
        footer: "",
        fields: []
      }
    ],
    buttons: [],
    replies: []
  }
});

const rulesTemplate = () => ({
  ...blankScript(),
  id: state.currentId ?? "",
  name: "rules panel",
  description: "rules, roles, navigation, modmail",
  message: {
    content:
      "welcome to the server\nhang out, post stuff, and be cool.",
    imageUrl: "",
    embeds: [
      {
        title: "start here",
        description:
          "read the rules, grab roles, use navigation, and message mods if you need help.",
        color: "#a996ff",
        thumbnail: "",
        image: "",
        footer: "frazbot",
        fields: []
      }
    ],
    buttons: [
      { label: "Rules", replyId: "rules", emoji: "" },
      { label: "Roles", url: "https://discord.com", emoji: "" },
      { label: "Navigation", url: "https://discord.com", emoji: "" },
      { label: "ModMail", url: "https://discord.com", emoji: "" }
    ],
    replies: [
      {
        id: "rules",
        title: "rules",
        content: "read the rules, grab roles, use navigation, and message mods if you need help.",
        imageUrl: ""
      }
    ]
  }
});

function setToast(message, isError = false) {
  elements.toast.textContent = message;
  elements.toast.style.color = isError ? "#ffaaaa" : "#aeb4c7";
}

function setAutoPostsToast(message, isError = false) {
  elements.autoPostsToast.textContent = message;
  elements.autoPostsToast.style.color = isError ? "#ffaaaa" : "#aeb4c7";
}

function setMentionRepliesToast(message, isError = false) {
  elements.mentionRepliesToast.textContent = message;
  elements.mentionRepliesToast.style.color = isError ? "#ffaaaa" : "#aeb4c7";
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers ?? {})
  };

  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "same-origin",
    headers
  });
  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    window.location.href = data.loginUrl ?? "/login.html";
    return null;
  }

  if (!response.ok) {
    throw new Error(data.error ?? `Request failed with ${response.status}`);
  }

  return data;
}

function saveLocalDraft(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value }));
  } catch {
    // Browser storage can be blocked or full. The website still works without drafts.
  }
}

function loadLocalDraft(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw).value : null;
  } catch {
    return null;
  }
}

function removeLocalDraft(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage errors.
  }
}

function saveEditorDraft() {
  saveLocalDraft(EDITOR_DRAFT_KEY, formToScript());
}

function restoreEditorDraft() {
  const script = loadLocalDraft(EDITOR_DRAFT_KEY);
  if (!script) {
    return;
  }

  fillForm(script);
  setToast("Restored browser draft. Press Save when it looks right.");
}

function renderAndSaveDraft() {
  renderPreview();
  saveEditorDraft();
}

function watchCardInputs(card) {
  for (const input of card.querySelectorAll("input, select, textarea")) {
    input.addEventListener("input", renderAndSaveDraft);
    input.addEventListener("change", renderAndSaveDraft);
  }
}

function makeButtonCard(button = {}) {
  const card = document.createElement("div");
  card.className = "embed-card button-card";
  card.innerHTML = `
    <div class="embed-card-head">
      <strong>Button</strong>
      <button class="mini-button remove-button-card" type="button">Remove</button>
    </div>
    <div class="form-grid">
      <label>
        <span>Label</span>
        <input class="button-label" type="text" maxlength="80" />
      </label>
      <label>
        <span>Emoji</span>
        <input class="button-emoji" type="text" maxlength="64" />
      </label>
    </div>
    <div class="form-grid">
      <label>
        <span>Type</span>
        <select class="button-kind">
          <option value="reply">Private reply</option>
          <option value="link">Link</option>
        </select>
      </label>
      <label>
        <span>Target</span>
        <input class="button-target" type="text" maxlength="512" />
      </label>
    </div>
  `;

  const kind = button.url ? "link" : "reply";
  card.querySelector(".button-label").value = button.label ?? "";
  card.querySelector(".button-emoji").value = button.emoji ?? "";
  card.querySelector(".button-kind").value = kind;
  card.querySelector(".button-target").value = kind === "reply" ? button.replyId ?? "" : button.url ?? "";
  card.querySelector(".remove-button-card").addEventListener("click", () => {
    card.remove();
    renderAndSaveDraft();
  });

  watchCardInputs(card);
  return card;
}

function renderButtonCards(buttons = []) {
  elements.buttonsList.innerHTML = "";
  for (const button of buttons) {
    elements.buttonsList.append(makeButtonCard(button));
  }
}

function collectButtonCards() {
  return [...elements.buttonsList.querySelectorAll(".button-card")]
    .map((card) => {
      const label = card.querySelector(".button-label").value.trim();
      const emoji = card.querySelector(".button-emoji").value.trim();
      const kind = card.querySelector(".button-kind").value;
      const target = card.querySelector(".button-target").value.trim();

      if (kind === "reply") {
        return { label, replyId: target.toLowerCase(), emoji };
      }

      return { label, url: target, emoji };
    })
    .filter((button) => button.label && (button.url || button.replyId));
}

function makePrivateReplyCard(reply = {}) {
  const card = document.createElement("div");
  card.className = "embed-card private-reply-card";
  card.innerHTML = `
    <div class="embed-card-head">
      <strong>Private reply</strong>
      <button class="mini-button remove-private-reply" type="button">Remove</button>
    </div>
    <div class="form-grid">
      <label>
        <span>Reply ID</span>
        <input class="private-reply-id" type="text" maxlength="40" />
      </label>
      <label>
        <span>Title</span>
        <input class="private-reply-title" type="text" maxlength="80" />
      </label>
    </div>
    <label>
      <span>Message</span>
      <textarea class="private-reply-content" rows="3" maxlength="1900"></textarea>
    </label>
    <label>
      <span>Image URL</span>
      <input class="private-reply-image" type="url" />
    </label>
  `;

  card.querySelector(".private-reply-id").value = reply.id ?? "";
  card.querySelector(".private-reply-title").value = reply.title ?? "";
  card.querySelector(".private-reply-content").value = reply.content ?? "";
  card.querySelector(".private-reply-image").value = reply.imageUrl ?? "";
  card.querySelector(".remove-private-reply").addEventListener("click", () => {
    card.remove();
    renderAndSaveDraft();
  });

  watchCardInputs(card);
  return card;
}

function renderPrivateReplies(replies = []) {
  elements.privateRepliesList.innerHTML = "";
  for (const reply of replies) {
    elements.privateRepliesList.append(makePrivateReplyCard(reply));
  }
}

function collectPrivateReplies() {
  return [...elements.privateRepliesList.querySelectorAll(".private-reply-card")]
    .map((card) => ({
      id: card.querySelector(".private-reply-id").value.trim().toLowerCase(),
      title: card.querySelector(".private-reply-title").value.trim(),
      content: card.querySelector(".private-reply-content").value.trim(),
      imageUrl: card.querySelector(".private-reply-image").value.trim()
    }))
    .filter((reply) => reply.id);
}

function makeExtraEmbedCard(embed = {}) {
  const card = document.createElement("div");
  card.className = "embed-card extra-embed-card";
  card.innerHTML = `
    <div class="embed-card-head">
      <strong>Embed</strong>
      <button class="mini-button remove-extra-embed" type="button">Remove</button>
    </div>
    <label>
      <span>Title</span>
      <input class="extra-embed-title" type="text" maxlength="256" />
    </label>
    <label>
      <span>Description</span>
      <textarea class="extra-embed-description" rows="3" maxlength="4096"></textarea>
    </label>
    <div class="form-grid">
      <label>
        <span>Accent</span>
        <input class="extra-embed-color" type="color" />
      </label>
      <label>
        <span>Image URL</span>
        <input class="extra-embed-image" type="url" />
      </label>
    </div>
    <label>
      <span>Footer</span>
      <input class="extra-embed-footer" type="text" maxlength="2048" />
    </label>
  `;

  card.querySelector(".extra-embed-title").value = embed.title ?? "";
  card.querySelector(".extra-embed-description").value = embed.description ?? "";
  card.querySelector(".extra-embed-color").value = embed.color ?? "#a996ff";
  card.querySelector(".extra-embed-image").value = embed.image ?? "";
  card.querySelector(".extra-embed-footer").value = embed.footer ?? "";
  card.querySelector(".remove-extra-embed").addEventListener("click", () => {
    card.remove();
    renderAndSaveDraft();
  });

  watchCardInputs(card);

  return card;
}

function renderExtraEmbeds(embeds = []) {
  elements.extraEmbedsList.innerHTML = "";
  for (const embed of embeds) {
    elements.extraEmbedsList.append(makeExtraEmbedCard(embed));
  }
}

function collectExtraEmbeds() {
  return [...elements.extraEmbedsList.querySelectorAll(".extra-embed-card")].map((card) => ({
    title: card.querySelector(".extra-embed-title").value.trim(),
    description: card.querySelector(".extra-embed-description").value.trim(),
    color: card.querySelector(".extra-embed-color").value || "#a996ff",
    image: card.querySelector(".extra-embed-image").value.trim(),
    thumbnail: "",
    footer: card.querySelector(".extra-embed-footer").value.trim(),
    fields: []
  }));
}

function makeReplyEmbedCard(row = {}) {
  const embed = row.embed ?? {};
  const card = document.createElement("div");
  card.className = "embed-card reply-embed-card";
  card.innerHTML = `
    <div class="embed-card-head">
      <strong>Reply embed</strong>
      <button class="mini-button remove-reply-embed" type="button">Remove</button>
    </div>
    <label>
      <span>Reply ID</span>
      <input class="reply-embed-id" type="text" maxlength="40" />
    </label>
    <label>
      <span>Title</span>
      <input class="reply-embed-title" type="text" maxlength="256" />
    </label>
    <label>
      <span>Description</span>
      <textarea class="reply-embed-description" rows="3" maxlength="4096"></textarea>
    </label>
    <div class="form-grid">
      <label>
        <span>Accent</span>
        <input class="reply-embed-color" type="color" />
      </label>
      <label>
        <span>Image URL</span>
        <input class="reply-embed-image" type="url" />
      </label>
    </div>
    <label>
      <span>Footer</span>
      <input class="reply-embed-footer" type="text" maxlength="2048" />
    </label>
  `;

  card.querySelector(".reply-embed-id").value = row.id ?? "";
  card.querySelector(".reply-embed-title").value = embed.title ?? "";
  card.querySelector(".reply-embed-description").value = embed.description ?? "";
  card.querySelector(".reply-embed-color").value = embed.color ?? "#a996ff";
  card.querySelector(".reply-embed-image").value = embed.image ?? "";
  card.querySelector(".reply-embed-footer").value = embed.footer ?? "";
  card.querySelector(".remove-reply-embed").addEventListener("click", () => {
    card.remove();
    renderAndSaveDraft();
  });

  watchCardInputs(card);
  return card;
}

function renderReplyEmbeds(replies = []) {
  elements.replyEmbedsList.innerHTML = "";
  for (const reply of replies) {
    for (const embed of reply.embeds ?? []) {
      elements.replyEmbedsList.append(makeReplyEmbedCard({ id: reply.id, embed }));
    }
  }
}

function collectReplyEmbeds() {
  return [...elements.replyEmbedsList.querySelectorAll(".reply-embed-card")]
    .map((card) => ({
      id: card.querySelector(".reply-embed-id").value.trim().toLowerCase(),
      embed: {
        title: card.querySelector(".reply-embed-title").value.trim(),
        description: card.querySelector(".reply-embed-description").value.trim(),
        color: card.querySelector(".reply-embed-color").value || "#a996ff",
        image: card.querySelector(".reply-embed-image").value.trim(),
        thumbnail: "",
        footer: card.querySelector(".reply-embed-footer").value.trim(),
        fields: []
      }
    }))
    .filter((row) => row.id);
}

function mergeReplyEmbeds(replies, replyEmbeds) {
  const next = replies.map((reply) => ({ ...reply, embeds: [] }));

  for (const row of replyEmbeds) {
    if (!row.id) {
      continue;
    }

    let reply = next.find((item) => item.id === row.id);
    if (!reply) {
      reply = { id: row.id, title: "", content: "", embeds: [] };
      next.push(reply);
    }

    reply.embeds.push(row.embed);
  }

  return next;
}

function firstEmbed(script) {
  return script.message?.embeds?.[0] ?? blankScript().message.embeds[0];
}

function fillForm(script) {
  const embeds = script.message?.embeds ?? [];
  const embed = firstEmbed(script);
  state.currentId = script.id || null;
  elements.selectedScriptId.textContent = state.currentId ?? "unsaved";
  elements.scriptName.value = script.name ?? "";
  elements.scriptDescription.value = script.description ?? "";
  elements.channelId.value = script.channelId ?? "";
  elements.messageContent.value = script.message?.content ?? "";
  elements.messageImage.value = script.message?.imageUrl ?? "";
  elements.embedTitle.value = embed.title ?? "";
  elements.embedDescription.value = embed.description ?? "";
  elements.embedColor.value = embed.color ?? "#5865f2";
  elements.embedImage.value = embed.image ?? "";
  elements.embedThumbnail.value = embed.thumbnail ?? "";
  elements.embedFooter.value = embed.footer ?? "";
  renderExtraEmbeds(embeds.slice(1));
  renderButtonCards(script.message?.buttons ?? []);
  renderPrivateReplies(script.message?.replies ?? []);
  renderReplyEmbeds(script.message?.replies ?? []);
  renderPreview();
  renderScriptList();
}

function formToScript() {
  const script = blankScript();
  script.id = state.currentId ?? "";
  script.name = elements.scriptName.value.trim() || "untitled";
  script.description = elements.scriptDescription.value.trim();
  script.channelId = elements.channelId.value.trim();
  script.message.content = elements.messageContent.value.trim();
  script.message.imageUrl = elements.messageImage.value.trim();
  script.message.embeds = [
    {
      title: elements.embedTitle.value.trim(),
      description: elements.embedDescription.value.trim(),
      color: elements.embedColor.value,
      image: elements.embedImage.value.trim(),
      thumbnail: elements.embedThumbnail.value.trim(),
      footer: elements.embedFooter.value.trim(),
      fields: []
    },
    ...collectExtraEmbeds()
  ];
  script.message.buttons = collectButtonCards();
  script.message.replies = mergeReplyEmbeds(collectPrivateReplies(), collectReplyEmbeds());
  return script;
}

function renderScriptList() {
  elements.scriptList.innerHTML = "";

  for (const script of state.scripts) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `script-card${script.id === state.currentId ? " active" : ""}`;
    button.innerHTML = `<strong></strong><p></p>`;
    button.querySelector("strong").textContent = script.name;
    button.querySelector("p").textContent = script.description || script.id;
    button.addEventListener("click", () => fillForm(script));
    elements.scriptList.append(button);
  }
}

function renderButtons(buttons) {
  elements.previewButtons.innerHTML = "";

  for (const button of buttons.filter((item) => item.label)) {
    const link = document.createElement("a");
    link.href = button.url || "#";
    link.textContent = button.emoji ? `${button.emoji} ${button.label}` : button.label;
    elements.previewButtons.append(link);
  }
}

function renderPreview() {
  const script = formToScript();
  const embed = firstEmbed(script);
  elements.previewContent.textContent = script.message.content;
  elements.previewMessageImage.src = script.message.imageUrl;
  elements.previewEmbedTitle.textContent = embed.title;
  elements.previewEmbedDescription.textContent = embed.description;
  elements.previewEmbedFooter.textContent = embed.footer;
  elements.previewEmbedImage.src = embed.image;
  elements.embedPreview.style.borderLeftColor = embed.color || "#5865f2";
  renderButtons(script.message.buttons);
}

async function loadMe() {
  const data = await api("/me");
  if (!data) {
    return;
  }

  state.user = data.user;
  elements.userName.textContent = data.user.username;
  if (data.user.avatar) {
    elements.userAvatar.src = data.user.avatar;
  } else {
    elements.userAvatar.removeAttribute("src");
  }
}

async function loadScripts() {
  const data = await api("/scripts");
  if (!data) {
    return;
  }
  state.scripts = data.scripts;
  renderScriptList();

  if (state.scripts.length > 0 && !state.currentId) {
    fillForm(state.scripts[0]);
  } else if (state.scripts.length === 0) {
    fillForm(blankScript());
  }
}

function fillAutoPosts(settings) {
  state.autoPosts = settings;
  elements.autoTwitchEnabled.checked = settings.twitch.enabled;
  elements.autoTwitchLogin.value = settings.twitch.channelLogin;
  elements.autoTwitchDiscordChannel.value = settings.twitch.discordChannelId;
  elements.autoTwitchMessage.value = settings.twitch.message;

  elements.autoYoutubeMainEnabled.checked = settings.youtubeMain.enabled;
  elements.autoYoutubeMainChannel.value = settings.youtubeMain.channelId;
  elements.autoYoutubeMainDiscordChannel.value = settings.youtubeMain.discordChannelId;
  elements.autoYoutubeMainMessage.value = settings.youtubeMain.message;

  elements.autoYoutubeVodsEnabled.checked = settings.youtubeVods.enabled;
  elements.autoYoutubeVodsChannel.value = settings.youtubeVods.channelId;
  elements.autoYoutubeVodsDiscordChannel.value = settings.youtubeVods.discordChannelId;
  elements.autoYoutubeVodsMessage.value = settings.youtubeVods.message;

  elements.autoTiktokEnabled.checked = settings.tiktok.enabled;
  elements.autoTiktokDiscordChannel.value = settings.tiktok.discordChannelId;
  elements.autoTiktokMessage.value = settings.tiktok.message;
}

function collectAutoPosts() {
  return {
    twitch: {
      enabled: elements.autoTwitchEnabled.checked,
      channelLogin: elements.autoTwitchLogin.value.trim(),
      discordChannelId: elements.autoTwitchDiscordChannel.value.trim(),
      message: elements.autoTwitchMessage.value.trim()
    },
    youtubeMain: {
      enabled: elements.autoYoutubeMainEnabled.checked,
      channelId: elements.autoYoutubeMainChannel.value.trim(),
      discordChannelId: elements.autoYoutubeMainDiscordChannel.value.trim(),
      lastVideoId: state.autoPosts?.youtubeMain?.lastVideoId ?? "",
      message: elements.autoYoutubeMainMessage.value.trim()
    },
    youtubeVods: {
      enabled: elements.autoYoutubeVodsEnabled.checked,
      channelId: elements.autoYoutubeVodsChannel.value.trim(),
      discordChannelId: elements.autoYoutubeVodsDiscordChannel.value.trim(),
      lastVideoId: state.autoPosts?.youtubeVods?.lastVideoId ?? "",
      message: elements.autoYoutubeVodsMessage.value.trim()
    },
    tiktok: {
      enabled: elements.autoTiktokEnabled.checked,
      discordChannelId: elements.autoTiktokDiscordChannel.value.trim(),
      message: elements.autoTiktokMessage.value.trim()
    }
  };
}

function saveAutoPostsDraft() {
  saveLocalDraft(AUTO_POSTS_DRAFT_KEY, collectAutoPosts());
}

function restoreAutoPostsDraft() {
  const settings = loadLocalDraft(AUTO_POSTS_DRAFT_KEY);
  if (settings) {
    fillAutoPosts(settings);
  }
}

async function loadAutoPosts() {
  const data = await api("/auto-posts");
  if (data) {
    fillAutoPosts(data.settings);
  }
}

function messagesToText(messages = []) {
  return messages.join("\n");
}

function textToMessages(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function usersToText(users = []) {
  return users.map((user) => `${user.userId} | ${user.messages.join(" / ")}`).join("\n");
}

function textToUsers(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [userId = "", messages = ""] = line.split("|").map((part) => part.trim());
      return {
        userId,
        messages: messages
          .split("/")
          .map((message) => message.trim())
          .filter(Boolean)
      };
    });
}

function fillMentionReplies(settings) {
  state.mentionReplies = settings;
  elements.mentionRepliesEnabled.checked = settings.enabled;
  elements.mentionDefaultMessages.value = messagesToText(settings.defaultMessages);
  elements.mentionUserReplies.value = usersToText(settings.users);
}

function collectMentionReplies() {
  return {
    enabled: elements.mentionRepliesEnabled.checked,
    defaultMessages: textToMessages(elements.mentionDefaultMessages.value),
    users: textToUsers(elements.mentionUserReplies.value)
  };
}

function saveMentionRepliesDraft() {
  saveLocalDraft(MENTION_REPLIES_DRAFT_KEY, collectMentionReplies());
}

function restoreMentionRepliesDraft() {
  const settings = loadLocalDraft(MENTION_REPLIES_DRAFT_KEY);
  if (settings) {
    fillMentionReplies(settings);
  }
}

async function loadMentionReplies() {
  const data = await api("/mention-replies");
  if (data) {
    fillMentionReplies(data.settings);
  }
}

async function refreshHealth() {
  try {
    const health = await api("/health");
    elements.botStatus.textContent = health.botReady ? "Bot ready" : "Bot offline";
    elements.botStatus.classList.toggle("ready", health.botReady);
  } catch {
    elements.botStatus.textContent = "API offline";
    elements.botStatus.classList.remove("ready");
  }
}

async function saveCurrent() {
  const script = formToScript();
  const path = state.currentId ? `/scripts/${state.currentId}` : "/scripts";
  const method = state.currentId ? "PUT" : "POST";
  const data = await api(path, {
    method,
    body: JSON.stringify(script)
  });

  state.currentId = data.script.id;
  await loadScripts();
  fillForm(data.script);
  saveEditorDraft();
  return data.script;
}

elements.editorForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await saveCurrent();
    setToast("Saved.");
  } catch (error) {
    setToast(error.message, true);
  }
});

elements.sendButton.addEventListener("click", async () => {
  try {
    const script = await saveCurrent();
    const data = await api(`/scripts/${script.id}/send`, {
      method: "POST",
      body: JSON.stringify({ channelId: elements.channelId.value.trim() })
    });
    setToast(`Sent message ${data.messageId}.`);
  } catch (error) {
    setToast(error.message, true);
  }
});

elements.deleteButton.addEventListener("click", async () => {
  if (!state.currentId) {
    fillForm(blankScript());
    return;
  }

  try {
    await api(`/scripts/${state.currentId}`, { method: "DELETE" });
    state.currentId = null;
    removeLocalDraft(EDITOR_DRAFT_KEY);
    await loadScripts();
    setToast("Deleted.");
  } catch (error) {
    setToast(error.message, true);
  }
});

elements.newScriptButton.addEventListener("click", () => {
  fillForm(blankScript());
  setToast("");
});

elements.templateButton.addEventListener("click", () => {
  fillForm(rulesTemplate());
  setToast("");
});

elements.addButtonCardButton.addEventListener("click", () => {
  elements.buttonsList.append(makeButtonCard({ replyId: "" }));
  renderAndSaveDraft();
});

elements.addPrivateReplyButton.addEventListener("click", () => {
  elements.privateRepliesList.append(makePrivateReplyCard({ id: "", title: "", content: "", imageUrl: "" }));
  renderAndSaveDraft();
});

elements.addExtraEmbedButton.addEventListener("click", () => {
  elements.extraEmbedsList.append(makeExtraEmbedCard({ color: "#a996ff" }));
  renderAndSaveDraft();
});

elements.addReplyEmbedButton.addEventListener("click", () => {
  elements.replyEmbedsList.append(makeReplyEmbedCard({ id: "", embed: { color: "#a996ff" } }));
  renderAndSaveDraft();
});

elements.autoPostsButton.addEventListener("click", () => {
  elements.autoPostsForm.classList.remove("is-hidden");
  elements.autoPostsForm.scrollIntoView({ behavior: "smooth", block: "start" });
});

elements.closeAutoPostsButton.addEventListener("click", () => {
  elements.autoPostsForm.classList.add("is-hidden");
});

elements.mentionRepliesButton.addEventListener("click", () => {
  elements.mentionRepliesForm.classList.remove("is-hidden");
  elements.mentionRepliesForm.scrollIntoView({ behavior: "smooth", block: "start" });
});

elements.closeMentionRepliesButton.addEventListener("click", () => {
  elements.mentionRepliesForm.classList.add("is-hidden");
});

elements.autoPostsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const data = await api("/auto-posts", {
      method: "PUT",
      body: JSON.stringify(collectAutoPosts())
    });
    fillAutoPosts(data.settings);
    saveAutoPostsDraft();
    setAutoPostsToast("Saved.");
  } catch (error) {
    setAutoPostsToast(error.message, true);
  }
});

elements.mentionRepliesForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const data = await api("/mention-replies", {
      method: "PUT",
      body: JSON.stringify(collectMentionReplies())
    });
    fillMentionReplies(data.settings);
    saveMentionRepliesDraft();
    setMentionRepliesToast("Saved.");
  } catch (error) {
    setMentionRepliesToast(error.message, true);
  }
});

elements.editorForm.addEventListener("input", renderAndSaveDraft);
elements.editorForm.addEventListener("change", renderAndSaveDraft);
elements.autoPostsForm.addEventListener("input", saveAutoPostsDraft);
elements.autoPostsForm.addEventListener("change", saveAutoPostsDraft);
elements.mentionRepliesForm.addEventListener("input", saveMentionRepliesDraft);
elements.mentionRepliesForm.addEventListener("change", saveMentionRepliesDraft);

await loadMe();
await refreshHealth();
await loadScripts();
restoreEditorDraft();
await loadAutoPosts();
restoreAutoPostsDraft();
await loadMentionReplies();
restoreMentionRepliesDraft();
setInterval(refreshHealth, 5000);
