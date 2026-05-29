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
    .filter((button) => button.label && (button.url || button.action))
    .slice(0, 25);

  for (let index = 0; index < validButtons.length; index += 5) {
    const row = new ActionRowBuilder();
    const chunk = validButtons.slice(index, index + 5);

    for (const button of chunk) {
      const builder = new ButtonBuilder().setLabel(button.label);

      if (button.action) {
        builder.setCustomId(`frazbot:${button.action}`).setStyle(ButtonStyle.Primary);
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

export function buildDiscordPayload(script) {
  const message = script.message ?? {};
  const embeds = Array.isArray(message.embeds) ? message.embeds.map(buildEmbed) : [];
  const components = buildButtonRows(message.buttons);
  const payload = {
    content: message.content || undefined,
    embeds
  };

  if (components.length > 0) {
    payload.components = components;
  }

  if (!payload.content && embeds.length === 0) {
    throw new Error(`Script "${script.name}" has no message content or embed content.`);
  }

  return payload;
}
