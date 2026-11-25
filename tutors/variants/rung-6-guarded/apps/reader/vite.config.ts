/**
 * The reader's whole build configuration. SvelteKit 3 takes its options here, in the Vite plugin; upstream
 * does the same through packages/svelte/app-config/src/vite.js and svelte.js (no svelte.config.js).
 */
import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import { readerCspDirectives } from "./csp.ts";

export default defineConfig({
  plugins: [
    sveltekit({
      // A folder of files any static host can serve. Every route renders in the browser (ssr = false in
      // src/routes/+layout.ts), so one fallback page answers every URL: upstream's static adapter does the same.
      adapter: adapter({ pages: "build", assets: "build", fallback: "200.html" }),
      // Rung 6: a Content Security Policy in the built page. "hash" lets SvelteKit add the hash of its own
      // start-up script to script-src, so nothing else inline can run. The directives live in csp.ts (R-034).
      csp: { mode: "hash", directives: readerCspDirectives() },
    }),
  ],
  // The @ladder packages ship TypeScript source, so Vite bundles them rather than leaving them external.
  ssr: { noExternal: [/^@ladder\//] },
});
