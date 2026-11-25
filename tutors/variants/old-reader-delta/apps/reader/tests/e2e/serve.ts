/**
 * The built reader on a plain file server, and a browser to read it with. A path with no file is a route,
 * so it gets the app's fallback page, 200.html, which routes in the browser. Upstream tests its static build
 * the same way (apps/reader/tests/e2e/static-reader.spec.ts, served by tests/fixtures/static-reader/serve.mjs
 * with --fallback 200.html).
 */
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize } from "node:path";
import { chromium, type Browser } from "playwright";

const BUILD = join(import.meta.dirname, "..", "..", "build");
const TYPES: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };

export type Reader = { origin: string; browser: Browser; close(): Promise<void> };

export async function openReader(): Promise<Reader> {
  const server = createServer(async (request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url ?? "/", "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
    const file = await readFile(join(BUILD, path)).catch(() => undefined);
    response.writeHead(200, { "content-type": TYPES[file ? extname(path) : ".html"] ?? "application/octet-stream" });
    response.end(file ?? (await readFile(join(BUILD, "200.html"))));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch();
  return {
    origin: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    browser,
    async close() {
      await browser.close();
      server.close();
    },
  };
}
