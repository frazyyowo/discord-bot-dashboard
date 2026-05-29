import { getConfig } from "./config.js";
import { deployCommands } from "./bot.js";

const config = getConfig();
const commands = await deployCommands(config);

console.log(`Deployed ${commands.length} command(s).`);
