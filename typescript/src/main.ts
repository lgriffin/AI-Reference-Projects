/** Entry point: load configuration, build the application, listen. */

import { buildApp } from "./app.ts";
import { loadConfig } from "./config.ts";

const config = loadConfig();
await buildApp(config).listen({ port: config.port, host: "0.0.0.0" });
