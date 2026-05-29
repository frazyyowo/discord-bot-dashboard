import {
  ChannelType,
  Client,
  GatewayIntentBits,
  MessageFlags,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder
} from "discord.js";
import { buildDiscordPayload } from "./messagePayload.js";

export function buildCommands() {
  const command = new SlashCommandBuilder()
    .setName("script")
    .setDescription("Send and manage dashboard message scripts.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("List saved dashboard scripts.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("send")
        .setDescription("Send a saved dashboard script.")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Script name or id.")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Override the script channel.")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
    );

  return [command.toJSON()];
}

export async function deployCommands(config) {
  if (!config.discordToken || !config.clientId) {
    throw new Error("DISCORD_TOKEN and DISCORD_CLIENT_ID are required to deploy commands.");
  }

  const rest = new REST({ version: "10" }).setToken(config.discordToken);
  const route = config.guildId
    ? Routes.applicationGuildCommands(config.clientId, config.guildId)
    : Routes.applicationCommands(config.clientId);

  return rest.put(route, { body: buildCommands() });
}

async function findScript(storage, nameOrId) {
  const needle = String(nameOrId).toLowerCase();
  const scripts = await storage.listScripts();
  return scripts.find(
    (script) => script.id.toLowerCase() === needle || script.name.toLowerCase() === needle
  );
}

async function sendScriptToChannel(client, script, channelId) {
  if (!script.enabled) {
    throw new Error(`Script "${script.name}" is disabled.`);
  }
  if (!channelId) {
    throw new Error(`Script "${script.name}" does not have a channel id.`);
  }

  const channel = await client.channels.fetch(channelId);
  if (!channel || !channel.isTextBased?.() || typeof channel.send !== "function") {
    throw new Error(`Channel "${channelId}" is not a text channel the bot can send to.`);
  }

  return channel.send(buildDiscordPayload(script));
}

function canManageGuild(interaction) {
  return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
}

export function createBot({ storage, config }) {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds]
  });

  client.once("ready", () => {
    console.log(`Discord bot logged in as ${client.user.tag}`);
  });

  client.on("interactionCreate", async (interaction) => {
    try {
      if (interaction.isAutocomplete() && interaction.commandName === "script") {
        const focused = interaction.options.getFocused().toLowerCase();
        const scripts = await storage.listScripts();
        const choices = scripts
          .filter(
            (script) =>
              script.enabled &&
              (script.name.toLowerCase().includes(focused) ||
                script.id.toLowerCase().includes(focused))
          )
          .slice(0, 25)
          .map((script) => ({ name: script.name, value: script.id }));

        await interaction.respond(choices);
        return;
      }

      if (!interaction.isChatInputCommand() || interaction.commandName !== "script") {
        return;
      }

      if (!canManageGuild(interaction)) {
        await interaction.reply({
          content: "You need Manage Server permission to use this.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const subcommand = interaction.options.getSubcommand();
      if (subcommand === "list") {
        const scripts = await storage.listScripts();
        const lines = scripts.map((script) => {
          const channel = script.channelId ? ` -> <#${script.channelId}>` : "";
          return `- ${script.name} (${script.id})${channel}`;
        });

        await interaction.reply({
          content: lines.length > 0 ? lines.join("\n") : "No scripts saved yet.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (subcommand === "send") {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const name = interaction.options.getString("name", true);
        const overrideChannel = interaction.options.getChannel("channel");
        const script = await findScript(storage, name);

        if (!script) {
          await interaction.editReply(`I could not find a script named "${name}".`);
          return;
        }

        const channelId = overrideChannel?.id ?? script.channelId;
        const sent = await sendScriptToChannel(client, script, channelId);
        await interaction.editReply(`Sent "${script.name}" to <#${channelId}>: ${sent.url}`);
      }
    } catch (error) {
      console.error(error);
      const message = `Something went wrong: ${error.message}`;
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(message);
      } else {
        await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
      }
    }
  });

  return {
    client,

    isReady() {
      return client.isReady();
    },

    async start() {
      if (!config.discordToken) {
        console.warn("DISCORD_TOKEN is missing. Dashboard will run, but bot sending is disabled.");
        return;
      }

      await client.login(config.discordToken);
    },

    async sendScript(script, channelId) {
      if (!client.isReady()) {
        throw new Error("Discord bot is not logged in yet.");
      }

      return sendScriptToChannel(client, script, channelId ?? script.channelId);
    }
  };
}
