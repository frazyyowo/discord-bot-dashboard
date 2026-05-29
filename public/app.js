const state = {
  currentId: null,
  scripts: [],
  user: null
};

const elements = {
  botStatus: document.querySelector("#botStatus"),
  buttonsInput: document.querySelector("#buttonsInput"),
  channelId: document.querySelector("#channelId"),
  deleteButton: document.querySelector("#deleteButton"),
  editorForm: document.querySelector("#editorForm"),
  embedColor: document.querySelector("#embedColor"),
  embedDescription: document.querySelector("#embedDescription"),
  embedFooter: document.querySelector("#embedFooter"),
  embedImage: document.querySelector("#embedImage"),
  embedPreview: document.querySelector("#embedPreview"),
  embedThumbnail: document.querySelector("#embedThumbnail"),
  embedTitle: document.querySelector("#embedTitle"),
  messageContent: document.querySelector("#messageContent"),
  newScriptButton: document.querySelector("#newScriptButton"),
  previewButtons: document.querySelector("#previewButtons"),
  previewContent: document.querySelector("#previewContent"),
  previewEmbedDescription: document.querySelector("#previewEmbedDescription"),
  previewEmbedFooter: document.querySelector("#previewEmbedFooter"),
  previewEmbedImage: document.querySelector("#previewEmbedImage"),
  previewEmbedTitle: document.querySelector("#previewEmbedTitle"),
  saveButton: document.querySelector("#saveButton"),
  scriptDescription: document.querySelector("#scriptDescription"),
  scriptList: document.querySelector("#scriptList"),
  scriptName: document.querySelector("#scriptName"),
  selectedScriptId: document.querySelector("#selectedScriptId"),
  sendButton: document.querySelector("#sendButton"),
  sendSocialButton: document.querySelector("#sendSocialButton"),
  socialCaption: document.querySelector("#socialCaption"),
  socialChannelId: document.querySelector("#socialChannelId"),
  socialForm: document.querySelector("#socialForm"),
  socialPlatform: document.querySelector("#socialPlatform"),
  socialPostUrl: document.querySelector("#socialPostUrl"),
  socialToast: document.querySelector("#socialToast"),
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
    buttons: []
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
      { label: "Rules", url: "https://discord.com", emoji: "" },
      { label: "Roles", url: "https://discord.com", emoji: "" },
      { label: "Navigation", url: "https://discord.com", emoji: "" },
      { label: "ModMail", url: "https://discord.com", emoji: "" }
    ]
  }
});

function setToast(message, isError = false) {
  elements.toast.textContent = message;
  elements.toast.style.color = isError ? "#ffaaaa" : "#aeb4c7";
}

function setSocialToast(message, isError = false) {
  elements.socialToast.textContent = message;
  elements.socialToast.style.color = isError ? "#ffaaaa" : "#aeb4c7";
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

function buttonsToText(buttons = []) {
  return buttons.map((button) => [button.label, button.url, button.emoji].join(" | ")).join("\n");
}

function textToButtons(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label = "", url = "", emoji = ""] = line.split("|").map((part) => part.trim());
      return { label, url, emoji };
    });
}

function firstEmbed(script) {
  return script.message?.embeds?.[0] ?? blankScript().message.embeds[0];
}

function fillForm(script) {
  const embed = firstEmbed(script);
  state.currentId = script.id || null;
  elements.selectedScriptId.textContent = state.currentId ?? "unsaved";
  elements.scriptName.value = script.name ?? "";
  elements.scriptDescription.value = script.description ?? "";
  elements.channelId.value = script.channelId ?? "";
  elements.messageContent.value = script.message?.content ?? "";
  elements.embedTitle.value = embed.title ?? "";
  elements.embedDescription.value = embed.description ?? "";
  elements.embedColor.value = embed.color ?? "#5865f2";
  elements.embedImage.value = embed.image ?? "";
  elements.embedThumbnail.value = embed.thumbnail ?? "";
  elements.embedFooter.value = embed.footer ?? "";
  elements.buttonsInput.value = buttonsToText(script.message?.buttons ?? []);
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
  script.message.embeds = [
    {
      title: elements.embedTitle.value.trim(),
      description: elements.embedDescription.value.trim(),
      color: elements.embedColor.value,
      image: elements.embedImage.value.trim(),
      thumbnail: elements.embedThumbnail.value.trim(),
      footer: elements.embedFooter.value.trim(),
      fields: []
    }
  ];
  script.message.buttons = textToButtons(elements.buttonsInput.value);
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

elements.socialForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const data = await api("/social-post", {
      method: "POST",
      body: JSON.stringify({
        platform: elements.socialPlatform.value,
        postUrl: elements.socialPostUrl.value.trim(),
        caption: elements.socialCaption.value.trim(),
        channelId: elements.socialChannelId.value.trim() || elements.channelId.value.trim()
      })
    });
    if (data) {
      setSocialToast(`Sent ${data.messageId}.`);
    }
  } catch (error) {
    setSocialToast(error.message, true);
  }
});

for (const input of elements.editorForm.querySelectorAll("input, textarea")) {
  input.addEventListener("input", renderPreview);
}

await loadMe();
await refreshHealth();
await loadScripts();
setInterval(refreshHealth, 5000);
