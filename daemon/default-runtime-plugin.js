import { PiDiscordDaemon } from "./runtime.js";
import { buildSlashCommands } from "../lib/discord-commands.js";

export const apiVersion = 1;

export async function createRuntime({ config, paths }) {
  let daemon;
  return {
    id: "default",
    slashCommands: buildSlashCommands(config),
    async start() {
      daemon = new PiDiscordDaemon({ paths, config });
      await daemon.start();
    },
    async stop() {
      await daemon?.stop();
    },
  };
}
