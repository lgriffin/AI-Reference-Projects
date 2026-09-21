/** Configuration: the only module that reads the environment. Validated at start-up. */

import { z } from "zod";

const Environment = z.object({
  DATABASE_PATH: z.string().default("taskboard.db"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  WIP_LIMIT: z.coerce.number().int().min(1).default(3),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Config = Readonly<{
  databasePath: string;
  port: number;
  wipLimit: number;
  logLevel: "debug" | "info" | "warn" | "error";
}>;

export function loadConfig(): Config {
  const env = Environment.parse(process.env);
  return {
    databasePath: env.DATABASE_PATH,
    port: env.PORT,
    wipLimit: env.WIP_LIMIT,
    logLevel: env.LOG_LEVEL,
  };
}
