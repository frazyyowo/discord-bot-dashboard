import { createAutoPostManager } from "./autoPosts.js";
import { createBot } from "./bot.js";
import { getConfig } from "./config.js";
import { createDashboardServer } from "./server.js";
import { createStorage } from "./storage.js";

const config = getConfig();
const storage = createStorage();
await storage.ensureStorage();

const bot = createBot({ storage, config });
await bot.start();

const autoPostManager = createAutoPostManager({ storage, bot, config });
const dashboard = createDashboardServer({ storage, bot, config, autoPostManager });
await dashboard.start();
await autoPostManager.start();

process.on("SIGINT", () => {
  console.log("Shutting down...");
  autoPostManager.stop();
  dashboard.server.close();
  bot.client.destroy();
  process.exit(0);
});
