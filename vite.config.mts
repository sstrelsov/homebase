import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import mdx from "@mdx-js/rollup";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";
import viteTsconfigPaths from "vite-tsconfig-paths";

// Absolute base for link-preview URLs. `make phone-preview` points it at this
// Mac so a phone can fetch the preview before the site is live.
const SITE = process.env.STACHED_SITE ?? "https://spencerstrelsov.com";
// The preview card, drawn by the Stached API (at the address in
// src/stached/api.ts).
const STACHED_CARD = new URL(
  `${process.env.VITE_STACHED_API ?? "https://api.spencerstrelsov.com"}/card.png`,
  SITE,
).href;
const STACHED_DESCRIPTION = "Got ’stache?";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    {
      enforce: "pre",
      ...mdx({
        /* jsxImportSource: …, otherOptions… */
      }),
    },
    react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
    viteTsconfigPaths(),
    svgr({
      include: "**/*.svg?react",
    }),
    {
      name: "spa-fallback",
      closeBundle() {
        const outDir = resolve(__dirname, "build");
        const index = resolve(outDir, "index.html");
        // 404.html for unknown routes
        copyFileSync(index, resolve(outDir, "404.html"));
        // Static copies for known routes so GitHub Pages returns 200
        for (const route of ["about", "projects"]) {
          mkdirSync(resolve(outDir, route), { recursive: true });
          copyFileSync(index, resolve(outDir, route, "index.html"));
        }
        // Stached is unlisted: noindex in the static HTML, before any JS runs,
        // plus its own title and preview card for when the link is shared.
        // The API draws the card: today's puzzle number and date, with the next
        // border color on each fetch (stached-api/card.ts).
        const stached = `
    <meta name="robots" content="noindex, nofollow" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Stached" />
    <meta property="og:description" content="${STACHED_DESCRIPTION}" />
    <meta property="og:url" content="${SITE}/stached" />
    <meta property="og:image" content="${STACHED_CARD}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="apple-mobile-web-app-title" content="Stached" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />`;
        const page = readFileSync(index, "utf8")
          .replace("<head>", `<head>${stached}`)
          .replace(/<title>.*<\/title>/, "<title>Stached</title>")
          // Its own home-screen app: Gerald's icon, and no manifest yet. Home
          // links Stached's, scoped to /stached, once it knows whether it
          // carries a sign-in code: iOS reads only the first a page links
          // (src/stached/HomeScreen.tsx).
          .replace(
            /<link rel="apple-touch-icon" href="[^"]*" \/>/,
            '<link rel="apple-touch-icon" href="/images/stached-icon-v2-180.png" />',
          )
          .replace(/\s*<link rel="manifest" href="[^"]*" \/>/, "")
          // The toolbar and status bar take the page's cream before any JS runs
          .replace(
            /<meta name="theme-color" content="[^"]*" \/>/,
            '<meta name="theme-color" content="#f4e9d0" />',
          )
          .replace(
            /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
            `<meta name="description" content="${STACHED_DESCRIPTION}" />`,
          );
        // The game's fixed pages, so direct loads get a 200 and the card.
        // Day pages (/stached/2026-09-29) fall back to 404.html, which still
        // runs the app; their dates live in the private puzzles file.
        for (const route of [
          "stached",
          "stached/leaderboard",
          "stached/past",
          "stached/admin",
        ]) {
          mkdirSync(resolve(outDir, route), { recursive: true });
          writeFileSync(resolve(outDir, route, "index.html"), page);
        }
      },
    },
  ],
  build: {
    outDir: "build",
  },
  // Dev: /stached-api goes to a local Stached API (on 3999, or
  // STACHED_API_PORT), and Tailscale Serve may front the dev server on a
  // *.ts.net host (see `make phone`).
  server: {
    allowedHosts: [".ts.net"],
    proxy: {
      "/stached-api": {
        target: `http://localhost:${process.env.STACHED_API_PORT ?? 3999}`,
        rewrite: (path) => path.replace(/^\/stached-api/, ""),
      },
    },
  },
});
