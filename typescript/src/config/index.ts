/**
 * Pattern 5 — Configuration Externalisation
 *
 * Every tuneable value comes from an environment variable, validated at
 * startup with Zod.  The application fails fast with a clear message if
 * any required variable is missing or malformed.  The exported `config`
 * object is deeply frozen so nothing can mutate it at runtime.
 */

import { z } from "zod";

const configSchema = z.object({
  port: z
    .string()
    .default("3000")
    .transform(Number)
    .pipe(z.number().int().min(1).max(65535)),

  host: z.string().default("0.0.0.0"),

  nodeEnv: z
    .enum(["development", "production", "test"])
    .default("development"),

  databaseUrl: z.string().min(1),

  logLevel: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),

  defaultPageSize: z
    .string()
    .default("20")
    .transform(Number)
    .pipe(z.number().int().min(1).max(100)),
});

export type AppConfig = z.infer<typeof configSchema>;

function loadConfig(): AppConfig {
  const result = configSchema.safeParse({
    port: process.env["PORT"],
    host: process.env["HOST"],
    nodeEnv: process.env["NODE_ENV"],
    databaseUrl: process.env["DATABASE_URL"],
    logLevel: process.env["LOG_LEVEL"],
    defaultPageSize: process.env["DEFAULT_PAGE_SIZE"],
  });

  if (!result.success) {
    const formatted = result.error.format();
    console.error("Invalid configuration:", JSON.stringify(formatted, null, 2));
    throw new Error("Application configuration is invalid — aborting startup.");
  }

  return Object.freeze(result.data);
}

export const config = loadConfig();
