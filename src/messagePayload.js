import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";

function colorToInt(value) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  const clean = String(value ?? "")
    .trim()
    .replace(/^#/, "");

  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    return null;
  }

  return Number.parseInt(clean, 16);
}

function buildEmbed(embed) {
  const builder = new EmbedBuilder();
  const color = colorToInt(embed.color);

  if (embed.title) {
    builder.setTitle(embed.title);
  }
  if (embed.description) {
    builder.setDescription(embed.description);
  }
  if (color !== null) {
    builder.setColor(color);
  }
  if (embed.thumbnail) {
    builder.setThumbnail(embed.thumbnail);
  }
  if (embed.image) {
    builder.setImage(embed.image);
  }
  if (embed.footer) {
    builder.setFooter({ text: embed.footer });
  }
  if (Array.isArray(embed.fields) && embed.fields.length > 0) {
    builder.addFields(embed.fields);
  }

  return builder;
}

function buildButtonRows(buttons = []) {
  const rows = [];
  const validButtons = buttons
    .filter((button) => button.label && (button.url || button.replyId))
    .slice(0, 25);

  for (let index = 0; index < validButtons.length; index += 5) {
    const row = new ActionRowBuilder();
    const chunk = validButtons.slice(index, index + 5);

    for (const button of chunk) {
      const builder = new ButtonBuilder().setLabel(button.label);

      if (button.replyId) {
        builder.setCustomId(`frazbot:reply:${button.replyId}`).setStyle(ButtonStyle.Primary);
      } else {
        builder.setStyle(ButtonStyle.Link).setURL(button.url);
      }

      if (button.emoji) {
        builder.setEmoji(button.emoji);
      }

      row.addComponents(builder);
    }

    rows.push(row);
  }

  return rows;
}

function buildImageFiles(imageUrl) {
  return imageUrl ? [{ attachment: imageUrl }] : [];
}

export function buildDiscordPayload(script) {
  const message = script.message ?? {};
  const embeds = Array.isArray(message.embeds) ? message.embeds.map(buildEmbed) : [];
  const components = buildButtonRows(message.buttons);
  const files = buildImageFiles(message.imageUrl);
  const payload = {
    content: message.content || undefined,
    embeds
  };

  if (files.length > 0) {
    payload.files = files;
  }

  if (components.length > 0) {
    payload.components = components;
  }

  if (!payload.content && embeds.length === 0 && files.length === 0) {
    throw new Error(`Script "${script.name}" has no message content, image, or embed content.`);
  }

  return payload;
}

export function buildPrivateReplyPayload(reply) {
  const embeds = Array.isArray(reply.embeds) ? reply.embeds.map(buildEmbed) : [];
  const files = buildImageFiles(reply.imageUrl);
  const content = [reply.title ? `**${reply.title}**` : "", reply.content || ""]
    .filter(Boolean)
    .join("\n")
    .slice(0, 2000);

  if (!content && embeds.length === 0 && files.length === 0) {
    return { content: "That reply is empty." };
  }

  const payload = {
    content: content || undefined,
    embeds
  };

  if (files.length > 0) {
    payload.files = files;
  }

  return payload;
}
