import { createBot } from "./bot.js";
import { getConfig } from "./config.js";
import { createDashboardServer } from "./server.js";
import { createStorage } from "./storage.js";
import { setupTwitchEventSub } from "./twitchEventSub.js";

const config = getConfig();
const storage = createStorage();
await storage.ensureStorage();

const bot = createBot({ storage, config });
await bot.start();

const dashboard = createDashboardServer({ storage, bot, config });
await dashboard.start();
await setupTwitchEventSub(config);

process.on("SIGINT", () => {
  console.log("Shutting down...");
  dashboard.server.close();
  bot.client.destroy();
  process.exit(0);
});
